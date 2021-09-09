const path               = require('path');
const express            = require('express');
const cors               = require('cors')
const morgan             = require('morgan');
const rateLimit          = require('express-rate-limit'); 
const cookieParser       = require('cookie-parser')
const compression        = require('compression')
const hpp                = require('hpp');
const helmet             = require('helmet');
const mongoSanitize      = require('express-mongo-sanitize');
const xss                = require('xss-clean');
const debugRouter        = require('./routes/debugRouter');
const userRouter         = require('./routes/userRouter');
const reviewRouter       = require('./routes/reviewRoutes');
const globalErrorHandler = require('./controllers/errorController');


const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// 1 - GLOBAL MIDDLEWARES
app.use(express.static(path.join(__dirname, 'public')));


    // Set. Security Http header
    app.use(helmet());

    // Development logging
    if (process.env.NODE_ENV === 'development') {
        app.use(morgan('dev'));
    }
    
    // Limit requests from same API
    const limit =rateLimit({
        windowMs: 60 * 60 * 1000, // 1 hours
        max: 100, // start blocking after 100 requests
        message:"Too many accounts created from this IP, please try again after an hour"
    })

    // only apply to requests that begin with /api/
    app.use('/api/', limit);

    
    //Body Parser reading data from body into reg.body
    app.use(cors());
    app.use(express.json());

    app.use(cookieParser())

    // Data sanitization against NoSQL query injection
    app.use(mongoSanitize());

    // Data sanitization against XSS query injection
    app.use(xss());

    // Prevent parameter pollution
    app.use(hpp({ 
        whitelist: ['debugTitle', 'author','technology' ]
    }))
    // 2 - ROUTES
    app.use('/api/v1/debug', debugRouter);
    app.use('/api/v1/users', userRouter);
    app.use('/api/v1/reviews', reviewRouter);

    // 3 - CATSH ALL ERROR 
    app.all('*', (req, res, next) => {
        next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
    });
    
    //4 - GLOBAL HANDLE ERROR MIDDLEWARES
    app.use(globalErrorHandler);
    //5 - compression  MIDDLEWARES
    app.use(compression());

    module.exports = app;
