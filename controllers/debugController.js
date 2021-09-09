    const express       = require('express');
    const cors          = require('cors');
    const Debug         = require('./../models/DebugModel');
    const factory       = require('./handlerFactory');


    const app = express();

    //JSON DATA
    app.use(cors());
    app.use(express.json());


    exports.createDebug  = factory.createOne(Debug)
    exports.getAllDebug  = factory.getAll(Debug);
    exports.getDebug     = factory.getOne(Debug);
    exports.updateDebug  = factory.updateOne(Debug);
    exports.deleteDebug  = factory.deleteOne(Debug);
