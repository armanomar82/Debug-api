const mongoose  = require('mongoose');
const Debug     = require('./DebugModel')

const reviewSchema = new mongoose.Schema(
    {
        review: {
            type: String,
            required: [true, 'Review can not be empty!']
        },
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        debug: {
            type: mongoose.Schema.ObjectId,
            ref: 'Debug',
            required: [true, 'Review must belong to a tour.']
        },
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: [true, 'Review must belong to a user']
        }
    },
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);


reviewSchema.pre(/^find/, function(next) {

    this.populate({
        path: 'user',
        select: 'username photo'
    });
    next();
});

reviewSchema.statics.calcAverageRatings = async function(debugId) {
    const stats = await this.aggregate(
        [
            {
                $match: { debug: debugId }
            },
            {
                $group: {
                    _id: '$debug',
                    nRating: { $sum: 1 },
                    avgRating: { $avg: '$rating' }
                }
            }
        ]);

    if (stats.length > 0) {
        await Debug.findByIdAndUpdate(debugId, {
            ratingsQuantity: stats[0].nRating,
            ratingsAverage: stats[0].avgRating
        });
    } else {
        await Debug.findByIdAndUpdate(debugId, {
            ratingsQuantity: 0,
            ratingsAverage: 4.5
        });
    }
};

reviewSchema.post('save', function() {
  // this points to current review
    this.constructor.calcAverageRatings(this.debug);
});
/**
 *  findByIdAndUpdate
 *  findByIdAndDelete
 */
reviewSchema.pre(/^findOneAnd/, async function(next) {
    this.r = await this.findOne();
    next();
});

reviewSchema.post(/^findOneAnd/, async function() {
  // await this.findOne(); does NOT work here, query has already executed
    await this.r.constructor.calcAverageRatings(this.r.debug);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
