import "antd/dist/antd.css";
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Form, message } from 'antd';
import TimerBar from '../../components/banners/timer-bar/TimerBar';
import { useNavigate } from 'react-router-dom';
import CodeSubmitForm from '../../components/forms/code-submit/CodeSubmitForm';
import { v4 as uuidv4 } from 'uuid';

// Styles.
// TODO(Ravi): Deprecate ProblemOfTheDay.css.
import './ProblemOfTheDay.css';
import styled, { css } from "styled-components";

// Authentication.
import { Auth } from "aws-amplify";
import Cookies from 'universal-cookie';
import ProblemDescription from "./Description/ProblemDescription";
import { joinClasses } from "../../utils/ClassUtils";
import Landing from "../Editor/CodeEditor/components/Landing";

// Utility.
const getUuid = require('uuid-by-string');

const ProblemContainer = styled.main`
  display: flex;
  flex-direction: row;
`

function Problem(){
  const [form] = Form.useForm();
  const [formLayout] = useState('horizontal');
  const [problem, SetProblem] = useState({});
  const [, SetUserStats] = useState(null);
  const [userId, SetUserId] = useState('');  
  const navigate = useNavigate();  
  const [timeLeft, setTimeLeft] = useState({});
  const [isProblemOfTheDay, SetIsProblemOfTheDay] = useState(false);
  const [searchParams] = useSearchParams();
  const problemId = useParams().problemId;
  let sessionId = useParams().sessionId || '';

const calculateTimeLeft = () => {
    const requestOptions = { 'method': 'GET' };
    const query = process.env.REACT_APP_API_URL + '/google/timeRemaining';
    fetch(query, requestOptions)
    .then(res => res.json())
    .then(responseJson => {
      const difference = responseJson.diffInMillis;
      const timeLeftResponse = {
        days: Math.floor((difference/(24 * 1000 * 60 * 60))),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      };
      setTimeLeft(timeLeftResponse);
      console.log(difference);
      console.log(timeLeftResponse);
    })
    .catch((error) => {      
      console.log(error);
    });
}
  async function getUserStats() {
    const cookies = new Cookies();
    const loginType = cookies.get('loginType');
    if (loginType === 'cognito') {
      getUserStatsCognito();
    } else {
      getUserStatsGoogleSSO();
    }
  }

  async function getUserId() {  
    const cookies = new Cookies();
    const loginType = cookies.get('loginType');
    let userId = '';
    if (loginType === 'cognito') {
        const currentSessionResponse = await Auth.currentSession();
        const accessToken = currentSessionResponse.getAccessToken();        
        userId = accessToken.payload.sub;        
    } else {
        const userAuth = await Auth.currentAuthenticatedUser();        
        userId = getUuid(userAuth.email);      
    }
    SetUserId(userId);
  }
  
  async function getUserId() {  
    const cookies = new Cookies();
    const loginType = cookies.get('loginType');
    let userId = '';
    if (loginType === 'cognito') {
        const currentSessionResponse = await Auth.currentSession();
        const accessToken = currentSessionResponse.getAccessToken();        
        userId = accessToken.payload.sub;        
    } else {
        const userAuth = await Auth.currentAuthenticatedUser();        
        userId = getUuid(userAuth.email);
    }    
    SetUserId(userId);
  }

  async function getUserStatsCognito() {
    const currentSessionResponse = await Auth.currentSession();
      const accessToken = currentSessionResponse.getAccessToken();
      const jwtToken = accessToken.getJwtToken();
      const query = process.env.REACT_APP_API_URL + '/me';
      const requestOptions = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + jwtToken
        }
      };
      fetch(query, requestOptions)
      .then(res => res.json())
      .then(responseJson => {
        SetUserStats(responseJson);
          
      })
      .catch((error) => {      
        console.log(error);
      });
  }

  async function getUserStatsGoogleSSO() {
    const userAuth = await Auth.currentAuthenticatedUser();
    const requestOptions = { 'method': 'GET' };
    const userId = getUuid(userAuth.email);
    const query = process.env.REACT_APP_API_URL + '/google/me?userId=' +userId;    
    fetch(query, requestOptions)
    .then(res => res.json())
    .then(responseJson => {
      SetUserStats(responseJson);        
    })
    .catch((error) => {      
      console.log(error);
    });
  }

  function showMessage(success, error, warning) {
    if (success !== null) {
        message.success({
        content: success,        
        className: 'display-message',
      });
    } else if (error !== null) {
        message.error({
        content: error,
        className: 'display-message',
      });
    } else if (warning !== null) {
      message.warning({
      content: warning,
      className: 'display-message',
    });
  }
}

function submitCode(query, requestOptions) {
    fetch(query, requestOptions)
     .then(res => res.json())
     .then(data => {
       if (data.message === 'Success') {
        const tweet_text = encodeURI(
          'Problem ' + data.userStats.numberOfSubmissions + '/300 done 💪 🔥.\n' +
          'I just solved the problem '+ problem.problemTitle +
          ' on www.threehundreddaysofcode.com\nJoin here to start the 300 day challenge with me.' +
          ' https://discord.gg/6duGefKtyv\ncc @300daysofcode'
          );
         const tweet_url = 'https://twitter.com/intent/tweet?text=' + tweet_text;
         const successMessage = <p>Submission updated successfully. Well done. Click <a href={tweet_url} target="_blank"> here </a> to share on Twitter.</p>;
         showMessage(successMessage);
       } else {
         const errorMessage = "Something went wrong. Please try again, later.";
         showMessage(null, errorMessage);
       }
     })
     .catch(console.log)
  }

  async function getProblemsWithRequestParams(query, requestOptions) {
    fetch(query, requestOptions)
      .then(res => res.json())
      .then(responseJson => {
        const problemsSet = responseJson.data;
        const max = responseJson.size;
        const rand = 1 + Math.random() * (max - 1);        
        navigate("/problem/" + problemsSet.at(rand).problemId);
        window.location.reload();
      })
      .catch((error) => {
        console.log(error);
      });
  }

  async function getProblemSetCognito() {
    const currentSessionResponse = await Auth.currentSession();
    const accessToken = currentSessionResponse.getAccessToken();
    const jwtToken = accessToken.getJwtToken();
    
    const query = process.env.REACT_APP_API_URL + '/problems';
    const requestOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + jwtToken
      }
    };
    getProblemsWithRequestParams(query, requestOptions);
  }
  
  async function submitGithubLink(values) {
    const cookies = new Cookies();
    const loginType = cookies.get('loginType');
    if (loginType === 'cognito') {
      submitCodeWithCognito(values);
    } else {
      submitCodeWithSSO(values);
    }
  }

  async function submitCodeWithSSO(values) {
    const query = process.env.REACT_APP_API_URL + '/google/submitCode';
    const userAuth = await Auth.currentAuthenticatedUser();   
    const userId = getUuid(userAuth.email);
    const requestOptions = {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        'userId': userId,
        'problemName': values.problemTitle,
        'problemLink': values.problemLink,
        'solutionLink': values.solutionLink
      })
    };
    submitCode(query, requestOptions);
  }

  async function submitCodeWithCognito(values) {
    const query = process.env.REACT_APP_API_URL + '/submitCode';
    const res = await Auth.currentSession();
    const accessToken = res.getAccessToken();
    const jwtToken = accessToken.getJwtToken();
    const userId = accessToken.payload.sub;
    const requestOptions = {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + jwtToken 
      },
      body: JSON.stringify({
        'userId': userId,
        'problemName': values.problemTitle,
        'problemLink': values.problemLink,
        'solutionLink': values.solutionLink
      })
    };
    submitCode(query, requestOptions);
  }

  async function getProblemFromURL() {
    const cookies = new Cookies();
    const loginType = cookies.get('loginType');
    if (loginType === 'cognito') {
      GetProblemFromURLCognito();
    } else {
      GetProblemFromURLGoogleSSO();
    }
  }

  async function GetProblemFromURLGoogleSSO() {
    const userAuth = await Auth.currentAuthenticatedUser();
    const requestOptions = { 'method': 'GET' };
    const userId = getUuid(userAuth.email);
    const query = process.env.REACT_APP_API_URL + '/google/problemById?userId=' + userId + "&problemId=" + problemId;
    fetch(query, requestOptions)
    .then(res => res.json())
    .then(responseJson => {
        if (sessionId === '') {
          if (responseJson.hasOwnProperty('sessionId')) sessionId = responseJson.sessionId;
          else sessionId = uuidv4();         
          // TODO(Ravi): Can we update the URL without reloading the page?
          navigate('/problem/' + problemId + "/" + sessionId);
        }
        SetProblem(responseJson);
        form.setFieldsValue(responseJson);
    })
    .catch((error) => {      
      console.log(error);
    });
  }

  async function GetProblemFromURLCognito() {    
    const currentSessionResponse = await Auth.currentSession();
    const accessToken = currentSessionResponse.getAccessToken();
    const jwtToken = accessToken.getJwtToken();
    const query = process.env.REACT_APP_API_URL + '/problemById?problemId=' + problemId;
    const requestOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + jwtToken
      }
    };
    fetch(query, requestOptions)
    .then(res => res.json())
    .then(responseJson => {
      if (sessionId === '') {
        if (responseJson.hasOwnProperty('sessionId')) sessionId = responseJson.sessionId;
        else sessionId = uuidv4();         
        // TODO(Ravi): Can we update the URL without reloading the page?
        navigate('/problem/' + problemId + "/" + sessionId);
      }
      SetProblem(responseJson);
      form.setFieldsValue(responseJson);
    })
    .catch((error) => {      
      console.log(error);
    });
  }

  useEffect(() => {
    getProblemFromURL();
    getUserStats();
    getUserId();
    calculateTimeLeft();
    SetIsProblemOfTheDay(searchParams.get("isProblemOfTheDay") === "1");
  }, []);

  const codeSubmitClass = 'code-submit-form-parent'
  const colClass = joinClasses([codeSubmitClass, codeSubmitClass+'-col'])
  const rowClass = joinClasses([codeSubmitClass, codeSubmitClass+'-row'])
  return (
    <div className='problem-solve-page-container'>
      <div className={colClass}>
        <div className="problem-timer-code-submit-container">
          <TimerBar
            problem={problem}        
            isProblemOfTheDay={isProblemOfTheDay} 
            timeLeft={timeLeft}
          />
          <CodeSubmitForm submitSolution={submitGithubLink} problem={problem} problemId={problemId}/>
        </div>
      </div>
      <ProblemContainer>
        <Landing
          problem={problem}
          // TODO(Ravi): Move the problemId within the problem object.
          problemId={problemId} 
          userId={userId} 
          sessionId={sessionId}
        />
        <ProblemDescription problem={problem} />
    </ProblemContainer>
    </div>
    )
};

export default Problem;