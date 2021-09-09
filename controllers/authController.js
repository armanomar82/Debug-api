
const crypto        = require('crypto');
const { promisify } = require('util');
const jwt           = require('jsonwebtoken');
const User          = require('./../models/userModel');
const catchAsync    = require('./../utils/catchAsync');
const AppError      = require('./../utils/AppError');
const sendEmail     = require('./../utils/email');

/*
* Sign asynchronously
* Create function SignToken
*/
const signToken = id => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
};

/*
* Create send token.
* Resble function in signup, login.
*/

const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id);
    //Backdate a jwt 30 seconds
    const cookieOptions = {
        expires: new Date(//convert to mily secunds.    day. minit . secund . mlisecound
        Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
        ),
        httpOnly: true
    };

    if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

    // defind cookie
    res.cookie('jwt', token, cookieOptions);

    // Remove password from output
    user.password = undefined;

    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
        user
        }
    });
};

/*
* Creat signup Function.
* Creat with body fild to resive the data.
*/
exports.signup = catchAsync(async (req, res, next) => {

    const newUser = await User.create({
        username: req.body.username,
        email: req.body.email,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm
    });
    console.log(newUser)

    createSendToken(newUser, 201, res);
});

/*
* Login function.
* Check if email and password exist.
* Check if user exists && password is correct
* Check if user exists && password is correct
*If everything ok, send token to client
*/

exports.login = catchAsync(async (req, res, next) => {
    //destrcti the variblr from file bode
    const { email, password } = req.body;

    // 1) Check if email and password exist
    if (!email || !password) {
        return next(new AppError('Please provide email and password!', 400));
    }
    // 2) Check if user exists && password is correct and slect password becuse is fols in the module
    const user = await User.findOne({ email }).select('+password');
    
    if (!user || !(await user.correctPassword(password, user.password))) {
        return next(new AppError('Incorrect email or password', 401));
    }
    // 3) If everything ok, send token to client
    // createSendToken(user, 200, res);
    const token = signToken(user._id);

    res.status(200).json({
        status: 'success',
        token
    });
});

/*
* Authorization User Roles and Permissions.
* Getting token and check of it's there.
* Check if not token Send error message
* Verification token
* If everything ok, send token to client
* Check if user still exists
* Check if user changed password after the token was issued
* GRANT ACCESS TO PROTECTED ROUTE
*/

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check of it's there
    let token;
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }else if(req.cookies.jwt)(
        token = req.cookies.jwt
    )

    if (!token) {
        return next(
        new AppError('You are not logged in! Please log in to get access.', 401)
        );
    }

    // 2) Verification token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
        return next(
        new AppError(
            'The user belonging to this token does no longer exist.',
            401
        )
        );
    }

    // 4) Check if user changed password after the token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next(
        new AppError('User recently changed password! Please log in again.', 401)
        );
    }

    // GRANT ACCESS TO PROTECTED ROUTE
    req.user = currentUser;
    next();
});


/*
* Restrict Functionality.
* Copey All roles.
* Restrict The How Has Permissions
* Condtion To control
* If The Has Permissions Pass To Next Function.
* Not Send Message Error And Breack
*/

exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        // roles ['Admin', 'User']. role='user'
        if (!roles.includes(req.user.role)) {
        return next(
            new AppError('You do not have permission to perform this action', 403)
        );
        }
        next();
    };
};

/*
* Password Forgot And  Reset Functionality Reset Token
* Forgot Password Functionality
* Get User Based On Posteded Email.
* Generate A Random Reset Token
* Send the reonse
* if the have error send massage
*/ 

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
        return next(new AppError('There is no user with email address.', 404));
    }

    // 2) Generate the random reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // 3) Send it to user's email
    const resetURL = `${req.protocol}://${req.get(
        'host'
    )}/api/v1/users/resetPassword/${resetToken}`;

    const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, please ignore this email!`;

    try {
        await sendEmail({
            email: user.email,
            subject: 'Your password reset token (valid for 10 min)',
            message
        });

        res.status(200).json({
            status: 'success',
            message: 'Token sent to email!'
        });
    } catch (err) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });

        return next(
            new AppError('There was an error sending the email. Try again later!'),
            500
        );
    }
});

/*
* Reset Password function.
* If token has not expired, and there is user, set the new password.
* Update changedPasswordAt property for the user
* Send the reonse
* Log the user in, send JWT
*/ 

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
    const hashedToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');

    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() }
    });

    // 2) If token has not expired, and there is user, set the new password
    if (!user) {
            return next(new AppError('Token is invalid or has expired', 400));
        }
        user.password = req.body.password;
        user.passwordConfirm = req.body.passwordConfirm;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });

        // 3) Update changedPasswordAt property for the user
        // 4) Log the user in, send JWT
        createSendToken(user, 200, res);
    });

/*
* UpdatePassword function.
* Get user from collection.
* If so, update password.
* Log user in, send JWT!
*/

    exports.updatePassword = catchAsync(async (req, res, next) => {
    // 1) Get user from collection
    const user = await User.findById(req.user.id).select('+password');

    // 2) Check if POSTed current password is correct. 
    // I create This Function In sid Schma
    if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
        return next(new AppError('Your current password is wrong.', 401));
    }

    // 3) If so, update password
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();
    // User.findByIdAndUpdate will NOT work as intended!

    // 4) Log user in, send JWT
    createSendToken(user, 200, res);
});