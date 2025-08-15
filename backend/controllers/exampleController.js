const Example = require('../models/Example');

// Controller methods
exports.getAllExamples = async (req, res, next) => {
  try {
    const examples = await Example.find();
    res.status(200).json({
      success: true,
      count: examples.length,
      data: examples
    });
  } catch (err) {
    next(err);
  }
};

exports.getExampleById = async (req, res, next) => {
  try {
    const example = await Example.findById(req.params.id);
    if (!example) {
      return res.status(404).json({
        success: false,
        message: 'Example not found'
      });
    }
    res.status(200).json({
      success: true,
      data: example
    });
  } catch (err) {
    next(err);
  }
};

exports.createExample = async (req, res, next) => {
  try {
    const example = await Example.create(req.body);
    res.status(201).json({
      success: true,
      data: example
    });
  } catch (err) {
    next(err);
  }
};

exports.updateExample = async (req, res, next) => {
  try {
    const example = await Example.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!example) {
      return res.status(404).json({
        success: false,
        message: 'Example not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: example
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteExample = async (req, res, next) => {
  try {
    const example = await Example.findByIdAndDelete(req.params.id);
    
    if (!example) {
      return res.status(404).json({
        success: false,
        message: 'Example not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};
