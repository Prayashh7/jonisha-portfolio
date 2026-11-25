
const { connectLambda, getStore } = require("@netlify/blobs");

function getBlobsStore(event, name) {
  if (!event) {
    throw new Error("Netlify Lambda event is required for Blobs initialization.");
  }

  // Initialize the Netlify Blobs environment for Lambda compatibility.
  connectLambda(event);

  return getStore({ name });
}

module.exports = { getBlobsStore };
