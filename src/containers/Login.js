import React, { useState, useEffect } from "react";
import Form from "react-bootstrap/Form";
import { Auth } from "aws-amplify";
import { useAppContext } from "../lib/contextLib";
import { useNavigate } from "react-router-dom";
import LoaderButton from '../components/LoaderButton';
import { onError } from '../lib/errorLib';
import { useFormFields } from '../lib/hooksLib';
import Cookies from 'universal-cookie';

// Styling.
import "../styles/Login.css";

function Login(props) {
  let navigate = useNavigate();
  const { userHasAuthenticated } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);
  const [fields, handleFieldChange] = useFormFields({
    username: "",
    password: ""
  });

  function validateForm() {
    return fields.username.length > 0 && fields.password.length > 0;
  }

  async function handlePasswordLogin(event) {
    event.preventDefault();
    setIsLoading(true);
    try {
      userHasAuthenticated(true);
      var cognitoUser = await Auth.signIn(fields.username, fields.password);
      const jwtToken = cognitoUser.signInUserSession.accessToken.jwtToken;
      const cookies = new Cookies();
      const expiresDate = new Date();
      expiresDate.setFullYear(new Date().getFullYear() + 1);
      cookies.set('isLoggedIn', 'true', { path: '/', expires: expiresDate });
      cookies.set('jwtToken', jwtToken, { path: '/', expires: expiresDate });
      cookies.set('loginType', 'cognito', { path: '/', expires: expiresDate });
      navigate("/submission");
    } catch (e) {
      onError(e);
    }
  }

  useEffect(() => {
    window.google.accounts.id.initialize({
      client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
      callback: data => handleCredentialResponse(data),
    });
    window.google.accounts.id.renderButton(
      document.getElementById("buttonDiv"), // Ensure the element exist and it is a div to display correcctly
      { theme: "outline", size: "large" }  // Customization attributes
    );
  }, []);

  function parseJwt (token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
   var jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
     return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
   }).join(''));
 
   return JSON.parse(jsonPayload);
 };

async function handleCredentialResponse(response) {
  const jwtToken = response.credential;
  const payload = parseJwt(jwtToken);
  const idToken = jwtToken;
  const expiresAt = payload.exp;
  const user = {
      email: payload.email,
      name: payload.name
  };
  await Auth.federatedSignIn(
      'google', { token: idToken, expiresAt }, user);
  const cookies = new Cookies();
  const expiresDate = new Date();
  expiresDate.setFullYear(new Date().getFullYear() + 1);
  cookies.set('isLoggedIn', 'true', { path: '/', expires: expiresDate });
  cookies.set('jwtToken', jwtToken, { path: '/', expires: expiresDate });
  cookies.set('loginType', 'googleSSO', { path: '/', expires: expiresDate });
  navigate('/');
}

return (
  <div className="Login">
    <Form onSubmit={handlePasswordLogin}>
      <Form.Group size="lg" controlId="username">
        <Form.Label>Email</Form.Label>
        <Form.Control
          autoFocus
          type="text"
          value={fields.username}
          onChange={handleFieldChange}
        />
      </Form.Group>
      <Form.Group className="margin-top-10" size="lg" controlId="password">
        <Form.Label>Password</Form.Label>
        <Form.Control
          type="password"
          value={fields.password}
          onChange={handleFieldChange}
        />
      </Form.Group>      
      <LoaderButton
        size="lg"
        type="submit"
        className="margin-top-20 button-large"
        isLoading={isLoading}
        disabled={!validateForm()}
      >
        Login
      </LoaderButton>
      <div className="signupContainer">Don't have an account? <a href="/signup">Sign up</a></div>
      <div className="forgotPasswordContainer">Forgot your password? <a href="/forgotPassword">Reset password</a></div>
      <hr className="solid divContainer" />
    </Form>
  </div>
);
}

export default Login;