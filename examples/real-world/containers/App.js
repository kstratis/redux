import React, { Component, PropTypes } from 'react'
import { connect } from 'react-redux'
import { browserHistory } from 'react-router'
import Explore from '../components/Explore'
import { resetErrorMessage } from '../actions'

class App extends Component {
  constructor(props) {
    {/* There is only one reason when one needs to pass props to super():
    When you want to access this.props in constructor.
    The constructor serves as the getInitialState function. Binds 'this'
    here to save binding later */}
    super(props)
    this.handleChange = this.handleChange.bind(this)
    this.handleDismissClick = this.handleDismissClick.bind(this)
  }


  // Dismisses the error message when a user repository
  // is not found and an error message is displayed
  handleDismissClick(e) {
    // resetErrorMessage is a redux action.
    // it is defined in actions.index.js
    this.props.resetErrorMessage()
    e.preventDefault()
  }

  // This function is used to change routes
  handleChange(nextValue) {
    browserHistory.push(`/${nextValue}`)
  }

  renderErrorMessage() {
    const { errorMessage } = this.props
    if (!errorMessage) {
      return null
    }
    return (
      <p style={{ backgroundColor: '#e99', padding: 10 }}>
        <b>{errorMessage}</b>
        {' '}
        (<a href="#"
            onClick={this.handleDismissClick}>
          Dismiss
        </a>)
      </p>
    )
  }

  render() {
    const { children, inputValue } = this.props
    return (
      <div>
        {/* In the beginning inputValue is null */}
        <Explore value={inputValue}
                 onChange={this.handleChange} />
        <hr />
        {this.renderErrorMessage()}
        {children}
      </div>
    )
  }
}

App.propTypes = {
  // Injected by React Redux
  errorMessage: PropTypes.string, // this is a string in redux state (reducers/index.js - state of the errorMessage function)
  resetErrorMessage: PropTypes.func.isRequired,  // this is a redux action (actions/index.js)
  inputValue: PropTypes.string.isRequired, // this is what we get from the url
  // Injected by React Router
  children: PropTypes.node
}

// ownProps are the router props. mapStateToProps always gets props as the last
// argument. They are shimmed here by react-router.
function mapStateToProps(state, ownProps) {
  return {
    errorMessage: state.errorMessage,
    inputValue: ownProps.location.pathname.substring(1)
  }
}

export default connect(mapStateToProps, {
  resetErrorMessage
})(App)
