var mongoose = require("mongoose");

// Save a reference to the Schema constructor
var Schema = mongoose.Schema;

// Using the Schema constructor, create a new Comment object
// This is similar to a Sequelize model
var Comment = new Schema({
  // `title` is of type String
  text: String
});

// This creates our model from the above schema, using mongoose's model method
var Comment = mongoose.model("Comment", Comment);

// Export the Comment model
module.exports = Comment;
