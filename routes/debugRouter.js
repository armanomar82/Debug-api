
const express           = require('express');
const debugController   = require('./../controllers/debugController')
const authController    = require('./../controllers/authController')
const reviewRoutes      = require('./../routes/reviewRoutes')


const router = express.Router();
/**
 * Nested Routes
 * POST debug/6665656/review
 * GET  debug/6665656/review
 * GET  debug/6665656/review/756556
 */
    
router.use('/:debugId/reviews', reviewRoutes)
/**
 * Authentication and Authorization POST - PATCH - DELETE
 * GET Free For The Public
 */
router
    .route('/')
    .get( debugController.getAllDebug )
    .post(
        authController.protect, 
        authController.restrictTo('admin','user'), 
        debugController.createDebug);
router
    .route('/:id')
    .get(debugController.getDebug)
    .patch(
        authController.protect,  
        authController.restrictTo('admin','user'), 
        debugController.updateDebug
        )
    .delete(
        authController.protect,  
        authController.restrictTo('admin'),  
        debugController.deleteDebug
        );

module.exports = router;
