import { Schema, arrayOf, normalize } from 'normalizr'
import { camelizeKeys } from 'humps'
import 'isomorphic-fetch'

// Extracts the next page URL from Github API response.
function getNextPageUrl(response) {
  const link = response.headers.get('link')
  if (!link) {
    return null
  }

  const nextLink = link.split(',').find(s => s.indexOf('rel="next"') > -1)
  if (!nextLink) {
    return null
  }

  return nextLink.split(';')[0].slice(1, -1)
}

const API_ROOT = 'https://api.github.com/'

// Fetches an API response and normalizes the result JSON according to schema.
// This makes every API response have the same shape, regardless of how nested it was.
function callApi(endpoint, schema) {
  console.log('callApi is called');
  const fullUrl = (endpoint.indexOf(API_ROOT) === -1) ? API_ROOT + endpoint : endpoint

  return fetch(fullUrl)
    .then(response =>
      response.json().then(json => ({ json, response }))
    ).then(({ json, response }) => {
      if (!response.ok) {
        return Promise.reject(json)
      }

      const camelizedJson = camelizeKeys(json)
      const nextPageUrl = getNextPageUrl(response)

      var temp = Object.assign({},
        normalize(camelizedJson, schema),
        { nextPageUrl }
      )
      console.log('promise returning')
      console.log(temp)
      return temp
    })
}

// We use this Normalizr schemas to transform API responses from a nested form
// to a flat form where repos and users are placed in `entities`, and nested
// JSON objects are replaced with their IDs. This is very convenient for
// consumption by reducers, because we can easily build a normalized tree
// and keep it updated as we fetch more data.

// Read more about Normalizr: https://github.com/paularmstrong/normalizr

// GitHub's API may return results with uppercase letters while the query
// doesn't contain any. For example, "someuser" could result in "SomeUser"
// leading to a frozen UI as it wouldn't find "someuser" in the entities.
// That's why we're forcing lower cases down there.

const userSchema = new Schema('users', {
  idAttribute: user => user.login.toLowerCase()
})

const repoSchema = new Schema('repos', {
  idAttribute: repo => repo.fullName.toLowerCase()
})

// Lets you specify relationships between different entities.
repoSchema.define({
  owner: userSchema
})

// Schemas for Github API responses.
export const Schemas = {
  USER: userSchema,
  USER_ARRAY: arrayOf(userSchema),
  REPO: repoSchema,
  REPO_ARRAY: arrayOf(repoSchema)
}

// Action key that carries API call info interpreted by this Redux middleware.
export const CALL_API = Symbol('Call API')

// A Redux middleware that interprets actions with CALL_API info specified.
// CALL_API is specified from within an action in actions/index.js
// Performs the call and promises when such actions are dispatched.
export default store => next => action => {
  // console.log('-----')
  // console.log(store)
  // console.log(next)
  // console.log('-----')
  const callAPI = action[CALL_API]
  // If the callAPI is not involved, pass control to the next middleware
  if (typeof callAPI === 'undefined') {
    return next(action)
  }

  console.log('middleware running')

  let { endpoint } = callAPI
  const { schema, types } = callAPI

  // endpoint is a function when it stands for the next page
  if (typeof endpoint === 'function') {
    endpoint = endpoint(store.getState())
  }

  // These are just error checks
  if (typeof endpoint !== 'string') {
    throw new Error('Specify a string endpoint URL.')
  }
  if (!schema) {
    throw new Error('Specify one of the exported Schemas.')
  }
  if (!Array.isArray(types) || types.length !== 3) {
    throw new Error('Expected an array of three action types.')
  }
  if (!types.every(type => typeof type === 'string')) {
    throw new Error('Expected action types to be strings.')
  }

  // just a building blog to compile the final action
  function actionWith(data) {
    // console.log(action);
    // console.log(data);
    // action is Symbol(Call API): Object
    // Symbol(Call API): Object
    //   endpoint: "users/kstratis"
    //   schema: EntitySchema
    //   types: Array[3]
    // data is Object {type: "USER_REQUEST"}
    const finalAction = Object.assign({}, action, data)
    // console.log(finalAction)
    // We already have the symbol data stored in {endpoint, schema, types}
    delete finalAction[CALL_API]
    console.log(finalAction)
    return finalAction
  }

  const [ requestType, successType, failureType ] = types
  // next is the logger middleware here
  console.log('This should be displayed just before the logs');

  // the main purpose of this particular request is to set at most
  // is fetching to true
  console.log('before next')
  next(actionWith({ type: requestType }))
  console.log('after next')
  // this is the real state changer
  return callApi(endpoint, schema).then(

    response => next(actionWith({
      response,
      type: successType
    })),
    error => next(actionWith({
      type: failureType,
      error: error.message || 'Something bad happened'
    }))
  )
}
