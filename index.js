const { Requester, Validator } = require('@chainlink/external-adapter')
require('dotenv').config()

// Define custom error scenarios for the API.
// Return true for the adapter to retry.
const customError = (data) => {
  if (data.Response === 'Error') return true
  return false
}

// Define custom parameters to be used by the adapter.
// Extra parameters can be stated in the extra object,
// with a Boolean value indicating whether or not they
// should be required.
const customParams = {
  tweetid: ['tweetid'],
  tweetContent: ['tweetcontent'],
  authorid: ['authorid']
}

const createRequest = (input, callback) => {
  // The Validator helps you validate the Chainlink request data
  const validator = new Validator(input, customParams)
  const jobRunID = validator.validated.id
  const tweetid = validator.validated.data.tweetid
  const url = 'https://api.twitter.com/2/tweets/' + tweetid
  console.log(url)
  const author_id = validator.validated.data.authorid
  const tweetContent = validator.validated.data.tweetContent

  const params = {
    expansions: 'author_id'
  }

  const headers = {
    'Authorization' : `Bearer ${process.env.BEARER_TOKEN}`
  }

  console.log(headers)

  // // This is where you would add method and headers
  // // you can add method like GET or POST and add it to the config
  // // The default is GET requests
  // // method = 'get' 
  // // headers = 'headers.....'
  const config = {
    url,
    params,
    headers
  }

  // // The Requester allows API calls be retry in case of timeout
  // // or connection failure
  Requester.request(config, customError)
    .then(response => {
      const tweet = response.data.data;
      console.log(author_id)
      console.log(tweet.author_id)
      response.data.result = tweetContent == tweet.text && tweet.author_id == author_id
      callback(response.status, Requester.success(jobRunID, response))
    })
    .catch(error => {
      callback(500, Requester.errored(jobRunID, error))
    })
}

// This is a wrapper to allow the function to work with
// GCP Functions
exports.gcpservice = (req, res) => {
  createRequest(req.body, (statusCode, data) => {
    res.status(statusCode).send(data)
  })
}

// This is a wrapper to allow the function to work with
// AWS Lambda
exports.handler = (event, context, callback) => {
  createRequest(event, (statusCode, data) => {
    callback(null, data)
  })
}

// This is a wrapper to allow the function to work with
// newer AWS Lambda implementations
exports.handlerv2 = (event, context, callback) => {
  createRequest(JSON.parse(event.body), (statusCode, data) => {
    callback(null, {
      statusCode: statusCode,
      body: JSON.stringify(data),
      isBase64Encoded: false
    })
  })
}

// This allows the function to be exported for testing
// or for running in express
module.exports.createRequest = createRequest
