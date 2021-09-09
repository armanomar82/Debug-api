const crypto    = require('crypto');
const mongoose  = require('mongoose');
const validator = require('validator');
const bcrypt    = require('bcryptjs');
const Debug         = require('./DebugModel')


const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Please provide username']
    },
    email: {
        type: String,
        required: [true, 'Please provide your email'],
        unique: true,
        lowercase: true,
        validate: [validator.isEmail, 'Please provide a valid email']
    },
    photo: {
        type: String,
        default: 'default.jpg'
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: 8,
        select: false
    },
    passwordConfirm: {
        type: String,
        required: [true, 'Please confirm your password'],
        validate: {
        // This only works on CREATE and SAVE!!! never work with finOneUpdate
        validator: function(el) {
            return el === this.password;
        },
        message: 'Passwords are not the same!'
    }
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: { //this feild alows user to un activat his account
        type: Boolean,
        default: true,
        select: false // this just for admin
    }
    
},
{
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
}

);



// mudlweer fanction

/*
* bcrypt A library to help you hash passwords.
* Pre middleware functions are executed one after another, when each middleware calls next.
* you can use a function that returns a promise
* This very scurty Aginst The bloed Attack Hackar
*
*/

    userSchema.virtual('reviews',{ 
        ref: 'Review', 
        foreignField : 'user', 
        localField: '_id'
    });


    
    userSchema.pre('save', async function(next) {
        // Only run this function if password was actually modified
        if (!this.isModified('password')) return next();

        // Hash the password with cost of 12
        this.password = await bcrypt.hash(this.password, 12);

        // Delete passwordConfirm field
        this.passwordConfirm = undefined;
        next();
    });


    // i use this function pefor sve like conditon
    userSchema.pre('save', function(next) {
    
        if (!this.isModified('password') || this.isNew) return next();
        //rest the time before save minas one second
        this.passwordChangedAt = Date.now() - 1000;

        next();

    });

    // this function it run befor requst 
    userSchema.pre(/^find/, function(next) {
        // this points to the current query
        this.find({ active: { $ne: false } });
        next();
    });


/*
* create correctPassword function btwin req and res to copmer the user hash with ather is not hash.
* Technique 2 (auto-gen a salt and hash):.
* we use compare functions return true or fols
* we calls this function in side login fuction to chech password
*
*/


    userSchema.methods.correctPassword = async function(
        candidatePassword,
        userPassword
        ) {
        return await bcrypt.compare(candidatePassword, userPassword);
    };


    userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {

        if (this.passwordChangedAt) {
            const changedTimestamp = parseInt(
            this.passwordChangedAt.getTime() / 1000,
            10
            );
            return JWTTimestamp < changedTimestamp;
        }
        // False means NOT changed
        return false;
    };

    // Create This Function To Create Random Hash to user in sid Forget Function 

    userSchema.methods.createPasswordResetToken = function() {

        const resetToken = crypto.randomBytes(32).toString('hex');

        this.passwordResetToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        console.log({ resetToken }, this.passwordResetToken);

        this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

        return resetToken;
    };

const User = mongoose.model('User', userSchema);



module.exports = User;