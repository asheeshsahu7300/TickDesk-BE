const mongoose = require('mongoose');

const subcategorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String }
});

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    subcategories: [subcategorySchema]
});

module.exports = mongoose.model('Category', categorySchema);
