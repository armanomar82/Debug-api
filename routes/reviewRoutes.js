const express          = require('express');
const reviewController = require('./../controllers/reviewController');
const authController   = require('./../controllers/authController');
/**
 * Preserve the req.params values from the parent router. 
 * If the parent and the child have conflicting param names, 
 * the child’s value take precedence.
 */
const router = express.Router({ mergeParams: true});
/**
 * POST debug/6665656/review
 * POST /review
 * GET(ALL) POST(Create)
 */

router.use(authController.protect);
/**
 * User Oprations
 */

router
    .route('/')
    .get(reviewController.getAllReviews)
    .post(
        authController.restrictTo('user'),
        reviewController.setDebugUserId ,
        reviewController.createReview
    );
/**
 * GET(details) UPDATE DELETE
 * /:params(id)
 */
    router
        .route('/:id')
        .get(reviewController.getReview)
        .patch(
            authController.restrictTo('user', 'admin'),
            reviewController.updateReview
        )
        .delete(
            authController.restrictTo('user', 'admin'),
            reviewController.deleteReview
        );

module.exports =router;


