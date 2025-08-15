const express = require('express');
const router = express.Router();

// Import controllers
const exampleController = require('../controllers/exampleController');

// Example routes
router.get('/examples', exampleController.getAllExamples);
router.get('/examples/:id', exampleController.getExampleById);
router.post('/examples', exampleController.createExample);
router.put('/examples/:id', exampleController.updateExample);
router.delete('/examples/:id', exampleController.deleteExample);

module.exports = router;
