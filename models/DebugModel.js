const mongoose = require('mongoose');
const slugify  = require('slugify');


const debugSchema = new mongoose.Schema(
    {
        debugTitle: {
            type: String,
            required: [true, 'A Debug must have a debug title'],
            trim: true,
        },
        author: {
            type: mongoose.Schema.ObjectId,
            ref: 'User'
        },
        technology:{
            type: String,
            trim: true
        },
        summary: {
            type: String,
            trim: true,
            required: [true, 'A Debug must have a description']
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        ratingsAverage: {
            type: Number,
            default: 4.5,
            min: [1, 'Rating must be above 1.0'],
            max: [5, 'Rating must be below 5.0'],
            set: val => Math.round(val * 10) / 10 // 4.666666, 46.6666, 47, 4.7
        },
        ratingsQuantity: {
            type: Number,
            default: 0
        },
        solution:{
            type:String,
            required: [true, 'A Debug must have a Solution'],
        },
        
        
        
    },
    {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
    }
);


// all function runs before .save() and .create()
// or run between req and res


    //virtual populate
    debugSchema.virtual('reviews',{ 
        ref: 'Review', 
        foreignField : 'debug', 
        localField: '_id'
    });

    debugSchema.pre(/^find/, function(next) {
    this.populate({
        path: 'author',
        select: '-__v '
    }).populate({
        path:'reviews' , 
        select:'-__v '
    });

    next();
});

    debugSchema.pre('save', function(next) {

        this.slug = slugify(this.debugTitle, { lower: true });

        next();
    });

    debugSchema.pre('save', function(next) {
        //console.log('Will save document...');
        next();
    });

    // debugSchema.post(/^find/, function(docs, next) {
    //     console.log(`Query took ${Date.now() - this.start} milliseconds!`);
    //     next();
    // });

const Debug = mongoose.model('Debug', debugSchema);

module.exports = Debug;