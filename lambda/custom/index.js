/* eslint-disable  func-names */
/* eslint-disable  no-console */
/*jshint esversion: 6 */

const Alexa = require('ask-sdk-core');
const https = require('https');
const i18n = require('i18next');
const sprintf = require('i18next-sprintf-postprocessor');
const requestPromise = require('request-promise');

const ANSWER_COUNT = 4;
const GAME_LENGTH = 5;

function handleUserGuess(userGaveUp, handlerInput) {
    const {
        requestEnvelope, attributesManager, responseBuilder
    } = handlerInput;
    const {
        intent
    } = requestEnvelope.request;

    let speechOutput = '';
    let speechOutputAnalysis = '';

    const sessionAttributes = attributesManager.getSessionAttributes();
    console.log('sessionattr', sessionAttributes);
    const gameQuestions = sessionAttributes.questions;
    const gameAnswers = sessionAttributes.answers;
    console.log('current question index');
    let currentScore = parseInt(sessionAttributes.score, 10);
    let currentQuestionIndex = parseInt(sessionAttributes.currentQuestionIndex,
        10);
    console.log('current question index', currentQuestionIndex);
    const correctAnswerText = gameAnswers[currentQuestionIndex];
    const requestAttributes = attributesManager.getRequestAttributes();
    const translatedQuestions = requestAttributes.t('QUESTIONS');

    console.log(intent.slots.Answer.value);
    if (intent.slots.Answer.value == gameAnswers[currentQuestionIndex].toLowerCase()) {
        currentScore += 1;
        speechOutputAnalysis = requestAttributes.t('ANSWER_CORRECT_MESSAGE');
    } else {
        if (!userGaveUp) {
            speechOutputAnalysis = requestAttributes.t('ANSWER_WRONG_MESSAGE');
        }

        speechOutputAnalysis += requestAttributes.t(
            'CORRECT_ANSWER_MESSAGE',
            gameAnswers[currentQuestionIndex]
        );
    }

    // Check if we can exit the game session after GAME_LENGTH questions (zero-indexed)
    if (sessionAttributes.currentQuestionIndex === GAME_LENGTH - 1) {
        speechOutput = userGaveUp ? '' : requestAttributes.t(
            'ANSWER_IS_MESSAGE');
        speechOutput += speechOutputAnalysis + requestAttributes.t(
            'GAME_OVER_MESSAGE',
            currentScore.toString(),
            GAME_LENGTH.toString()
        );

        return responseBuilder
            .speak(speechOutput)
            .getResponse();
    }
    currentQuestionIndex += 1;

    const questionIndexForSpeech = currentQuestionIndex + 1;
    let repromptText = requestAttributes.t(
        'TELL_QUESTION_MESSAGE',
        questionIndexForSpeech.toString()
    );

    speechOutput += userGaveUp ? '' : requestAttributes.t('ANSWER_IS_MESSAGE');
    speechOutput += speechOutputAnalysis + requestAttributes.t(
        'SCORE_IS_MESSAGE', currentScore.toString()) + repromptText;
    repromptText += requestAttributes.t('REPEAT_QUESTION_MESSAGE');

    Object.assign(sessionAttributes, {
        speechOutput: repromptText,
        repromptText,
        currentQuestionIndex,
        questions: gameQuestions,
        score: currentScore,
    });

    return responseBuilder.speak(speechOutput)
        .addAudioPlayerPlayDirective("REPLACE_ALL",
            spokenQuestion, 'token', 0)
        .reprompt(repromptText)
        .withSimpleCard(requestAttributes.t('GAME_NAME'), repromptText)
        .getResponse();
}

function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}

async function startGame(newGame, handlerInput) {
    //console.log("Input    :", handlerInput);
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    let speechOutput = newGame ? requestAttributes.t('NEW_GAME_MESSAGE',
        requestAttributes.t('GAME_NAME')) + requestAttributes.t(
        'WELCOME_MESSAGE', GAME_LENGTH.toString()) : '';
    var query = 'canada';
    var results;
    var quiz;
    var options = {
        host: 'www.xeno-canto.org',
        //path: '/species/Crypturellus-soui',
        path: '/api/2/recordings?query=q%3Aa+type%3Asong+cnt%3A' +
            encodeURIComponent(query),
        method: 'GET',
    };

    const req = await https.request(options, res => {
        res.setEncoding('utf8');
        var responseString = "";

        //accept incoming data asynchronously
        res.on('data', chunk => {
            responseString = responseString + chunk;
        });

        //return the data when streaming is complete
        res.on('end', () => {
            //let parsedString = JSON.parse(responseString);
            //console.log('reponse from httpGet: ' + parsedString);
            try {
                results = JSON.parse(responseString);
                quiz = getQuiz(GAME_LENGTH, results);
                console.log('quiz: ' + quiz);
                //Nicole
                const gameQuestions = quiz.questions;
                const currentQuestionIndex = 0;
                var spokenQuestion = quiz.questions[
                    currentQuestionIndex];
                let repromptText = requestAttributes.t(
                    'TELL_QUESTION_MESSAGE', '1');
                speechOutput += repromptText;
                const sessionAttributes = {};
                Object.assign(sessionAttributes, {
                    speechOutput: repromptText,
                    repromptText,
                    currentQuestionIndex,
                    questions: gameQuestions,
                    score: 0,
                });
                handlerInput.attributesManager.setSessionAttributes(
                    sessionAttributes);
                console.log('speech', repromptText);
                //spokenQuestion = 'https://www.xeno-canto.org/sounds/uploaded/WOPIRNCCSX/XC294012-Godmanchester-2015-07-05-09h53%20LS115555.mp3';

                //end Nicole
            } catch (e) {
                return handlerInput.responseBuilder
                    .speak(
                        'Sorry, I couldn\'t generate questions for that area. Please say again.'
                    )
                    .reprompt(
                        'Sorry, I couldn\'t generate questions for that area. Please say again.'
                    )
                    .getResponse();
            }
        });

    });
    req.end();
    console.log('end of function. i sad.');
    return handlerInput.responseBuilder
        .speak('hi there')
        .reprompt('reprompting')
        // playBehavior: interfaces.audioplayer.PlayBehavior, url: string, token: string, offsetInMilliseconds: number, expectedPreviousToken?: string, audioItemMetadata? : AudioItemMetadata)
        //  .addAudioPlayerPlayDirective("REPLACE_ALL", spokenQuestion, 'token', 0)
        .getResponse();
}

function helpTheUser(newGame, handlerInput) {
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    const askMessage = newGame ? requestAttributes.t('ASK_MESSAGE_START') :
        requestAttributes.t('REPEAT_QUESTION_MESSAGE') + requestAttributes.t(
            'STOP_MESSAGE');
    const speechOutput = requestAttributes.t('HELP_MESSAGE', GAME_LENGTH) +
        askMessage;
    const repromptText = requestAttributes.t('HELP_REPROMPT') + askMessage;

    return handlerInput.responseBuilder.speak(speechOutput).reprompt(
        repromptText).getResponse();
}

/* jshint -W101 */
const languageString = {
    en: {
        translation: {
            GAME_NAME: 'Bird Call Quiz',
            HELP_MESSAGE: 'I play you %s bird calls. Respond with the name of the bird. For example, say robin or american robin. To start a new game at any time, say, start game. ',
            REPEAT_QUESTION_MESSAGE: 'To repeat the last question, say, repeat. ',
            ASK_MESSAGE_START: 'Would you like to start playing?',
            HELP_REPROMPT: 'To give an answer to a question, respond with the number of the answer. ',
            STOP_MESSAGE: 'Would you like to keep playing?',
            CANCEL_MESSAGE: 'Ok, let\'s play again soon.',
            NO_MESSAGE: 'Ok, we\'ll play another time. Goodbye!',
            UNHANDLED_MESSAGE: 'Sorry, that command is not supported.',
            TRIVIA_UNHANDLED: 'Try saying the name of a bird',
            HELP_UNHANDLED: 'Say yes to continue, or no to end the game. ',
            START_UNHANDLED: 'Say start to start a new game. ',
            NEW_GAME_MESSAGE: 'Welcome to %s. ',
            WELCOME_MESSAGE: 'I will ask you %s questions, try to get as many right as you can. Just say the name of the bird. Let\'s begin. ',
            ANSWER_CORRECT_MESSAGE: 'correct. ',
            ANSWER_WRONG_MESSAGE: 'wrong. ',
            CORRECT_ANSWER_MESSAGE: 'The correct answer is %s: %s. ',
            ANSWER_IS_MESSAGE: 'That answer is ',
            TELL_QUESTION_MESSAGE: 'This is bird %s. ',
            REPEAT_QUESTION_MESSAGE: 'Ask me to repeat the song to hear it again. ',
            GAME_OVER_MESSAGE: 'You got %s out of %s questions correct. Thank you for playing!',
            SCORE_IS_MESSAGE: 'Your score is %s. '
        },
    },
};

const LocalizationInterceptor = {
    process(handlerInput) {
        const localizationClient = i18n.use(sprintf).init({
            lng: handlerInput.requestEnvelope.request.locale,
            overloadTranslationOptionHandler: sprintf.overloadTranslationOptionHandler,
            resources: languageString,
            returnObjects: true
        });

        const attributes = handlerInput.attributesManager.getRequestAttributes();
        attributes.t = function(...args) {
            return localizationClient.t(...args);
        };
    },
};

const httpsGetAsync = async function(options, callback) {
    const req = await requestPromise(options)
        .then(function(response) {
            return callback(response);
        })
        .catch(function(error) {
            console.log(error);
        });
}

function getQuiz(numQuestions, birdCallResults) {
    //console.log("In getQuiz");
    var quiz = {
        audioLinks: [],
        answers: []
    };
    var recordings = birdCallResults.recordings;
    const numRecordings = recordings.length;
    for (var i = 0; i < numRecordings; i++) {
        var index = getRandomInt(numRecordings);
        var recording = recordings[index];
        var birdName = recording.en;
        if (quiz.answers.indexOf(birdName) == -1) {
            quiz.answers.push(birdName);
            var audio = recording.file;
            quiz.audioLinks.push(audio);
        }
        if (quiz.audioLinks.length >= GAME_LENGTH) {
            break;
        }
    }
    if (quiz.audioLinks.length < GAME_LENGTH) {
        throw ("Not enough recordings.");
    }

    console.log("quiz.audiolinks:", quiz.audioLinks);
    console.log("quiz.answers", quiz.answers);
    return quiz;
}

async function getMp3RedirectUri(audioLink) {
    let options = {
        uri: 'https:' + audioLink,
        method: 'GET',
        resolveWithFullResponse: true
    };

    let mp3;
    await httpsGetAsync(options,
        function(response) {
            mp3 = response.request.uri.href;
        });
    return mp3;
}

const LaunchRequest = {
    canHandle(handlerInput) {
            const {
                request
            } = handlerInput.requestEnvelope;

            return request.type === 'LaunchRequest' || (request.type ===
                'IntentRequest' && request.intent.name ===
                'AMAZON.StartOverIntent');
        },
        async handle(handlerInput) {
            // Need to await/async/promise
            //console.log("Input    :", handlerInput);
            let errorString =
                'Sorry, I couldn\'t generate questions for that area. Please say again.';
            const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
            let speechOutput = true ? requestAttributes.t(
                    'NEW_GAME_MESSAGE', requestAttributes.t('GAME_NAME')) +
                requestAttributes.t('WELCOME_MESSAGE', GAME_LENGTH.toString()) :
                errorString;

            var query = 'canada';
            var results;
            var quiz;
            var options = {
                uri: 'https://www.xeno-canto.org/api/2/recordings?query=q%3Aa+type%3Asong+cnt%3A' +
                    encodeURIComponent(query),
                method: 'GET'
            };
            var spokenQuestion = '';

            await httpsGetAsync(options,
                function(response) {
                    console.log('Received a response');
                    try {
                        results = JSON.parse(response);
                        quiz = getQuiz(GAME_LENGTH, results);
                    } catch (error) {
                        console.log(error);
                    }
                });

            const gameQuestions = quiz.audioLinks;
            const currentQuestionIndex = 0;
            var mp3 = await getMp3RedirectUri(gameQuestions[
                currentQuestionIndex]);
            var spokenQuestion = 'Which bird is this?' + mp3;
            console.log('spoken question: ' + spokenQuestion);

            let repromptText = requestAttributes.t(
                'TELL_QUESTION_MESSAGE', '1');
            speechOutput += repromptText;
            const sessionAttributes = {};
            Object.assign(sessionAttributes, {
                speechOutput: repromptText,
                repromptText,
                currentQuestionIndex,
                questions: gameQuestions,
                answers: quiz.answers,
                currentRecording: mp3,
                score: 0,
            });
            await handlerInput.attributesManager.setSessionAttributes(
                sessionAttributes);
            return handlerInput.responseBuilder
                .speak(speechOutput)
                .addAudioPlayerPlayDirective("REPLACE_ALL",
                    spokenQuestion, 'token', 0)
                .reprompt(repromptText)
                .getResponse();
        }
};

const HelpIntent = {
    canHandle(handlerInput) {
            const {
                request
            } = handlerInput.requestEnvelope;

            return request.type === 'IntentRequest' && request.intent.name ===
                'AMAZON.HelpIntent';
        },
        handle(handlerInput) {
            const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

            const newGame = !(sessionAttributes.questions);
            return helpTheUser(newGame, handlerInput);
        },
};

const UnhandledIntent = {
    canHandle() {
            return true;
        },
        handle(handlerInput) {
            const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
            const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
            if (Object.keys(sessionAttributes).length === 0) {
                const speechOutput = requestAttributes.t('START_UNHANDLED');
                return handlerInput.attributesManager
                    .speak(speechOutput)
                    .reprompt(speechOutput)
                    .getResponse();
            } else if (sessionAttributes.questions) {
                const speechOutput = requestAttributes.t('TRIVIA_UNHANDLED',
                    ANSWER_COUNT.toString());
                return handlerInput.attributesManager
                    .speak(speechOutput)
                    .reprompt(speechOutput)
                    .getResponse();
            }
            const speechOutput = requestAttributes.t('HELP_UNHANDLED');
            return handlerInput.attributesManager.speak(speechOutput).reprompt(
                speechOutput).getResponse();
        },
};

const SessionEndedRequest = {
    canHandle(handlerInput) {
            return handlerInput.requestEnvelope.request.type ===
                'SessionEndedRequest';
        },
        handle(handlerInput) {
            console.log(
                `Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`
            );

            return handlerInput.responseBuilder
                .addAudioPlayerStopDirective()
                .getResponse();
        },
};

const AnswerIntent = {
    canHandle(handlerInput) {
            return handlerInput.requestEnvelope.request.type ===
                'IntentRequest' && (handlerInput.requestEnvelope.request.intent
                    .name === 'AnswerIntent' || handlerInput.requestEnvelope
                    .request.intent.name === 'DontKnowIntent');
        },
        handle(handlerInput) {
            console.log('Answer intent?');
            if (handlerInput.requestEnvelope.request.intent.name ===
                'AnswerIntent') {
                return handleUserGuess(false, handlerInput);
            }
            return handleUserGuess(true, handlerInput);
        },
};

const RepeatIntent = {
    canHandle(handlerInput) {
            return handlerInput.requestEnvelope.request.type ===
                'IntentRequest' && handlerInput.requestEnvelope.request.intent
                .name === 'AMAZON.RepeatIntent';
        },
        handle(handlerInput) {
            const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
            const currQIndex = sessionAttributes.currentQuestionIndex;
            const sessionAttributes = attributesManager.getSessionAttributes();
            const currentRecording = sessionAttributes.currentRecording;
            return handlerInput.responseBuilder
                .speak('Sure, here it is again')
                .addAudioPlayerPlayDirective("REPLACE_ALL",
                    currentRecording, 'token', 0)
                //.speak(sessionAttributes.speechOutput)
                .reprompt(sessionAttributes.repromptText)
                .getResponse();
        },
};

const YesIntent = {
    canHandle(handlerInput) {
            return handlerInput.requestEnvelope.request.type ===
                'IntentRequest' && handlerInput.requestEnvelope.request.intent
                .name === 'AMAZON.YesIntent';
        },
        async handle(handlerInput) {
            const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
            if (sessionAttributes.questions) {
                return handlerInput.responseBuilder.speak(sessionAttributes
                        .speechOutput)
                    .reprompt(sessionAttributes.repromptText)
                    .getResponse();
            }
            return startGame(false, handlerInput);
        },
};

const StopIntent = {
    canHandle(handlerInput) {
            return handlerInput.requestEnvelope.request.type ===
                'IntentRequest' && handlerInput.requestEnvelope.request.intent
                .name === 'AMAZON.StopIntent';
        },
        handle(handlerInput) {
            const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
            const speechOutput = requestAttributes.t('STOP_MESSAGE');

            return handlerInput.responseBuilder.speak(speechOutput)
                .addAudioPlayerStopDirective()
                .reprompt(speechOutput)
                .getResponse();
        },
};

const CancelIntent = {
    canHandle(handlerInput) {
            return handlerInput.requestEnvelope.request.type ===
                'IntentRequest' && handlerInput.requestEnvelope.request.intent
                .name === 'AMAZON.CancelIntent';
        },
        handle(handlerInput) {
            const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
            const speechOutput = requestAttributes.t('CANCEL_MESSAGE');

            return handlerInput.responseBuilder.speak(speechOutput)
                .addAudioPlayerStopDirective()
                .getResponse();
        },
};

const PauseIntent = {
    canHandle(handlerInput) {
            return handlerInput.requestEnvelope.request.type ===
                'IntentRequest' && handlerInput.requestEnvelope.request.intent
                .name === 'AMAZON.PauseIntent';
        },
        handle(handlerInput) {
            return handlerInput.responseBuilder.addAudioPlayerStopDirective()
                .getResponse();
        },
};

const ResumeIntent = {
    canHandle(handlerInput) {
            return handlerInput.requestEnvelope.request.type ===
                'IntentRequest' && handlerInput.requestEnvelope.request.intent
                .name === 'AMAZON.CancelIntent';
        },
        handle(handlerInput) {
            return handlerInput.responseBuilder.addAudioPlayerStopDirective()
                .getResponse();
        },
};

const NoIntent = {
    canHandle(handlerInput) {
            return handlerInput.requestEnvelope.request.type ===
                'IntentRequest' && handlerInput.requestEnvelope.request.intent
                .name === 'AMAZON.NoIntent';
        },
        handle(handlerInput) {
            const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
            const speechOutput = requestAttributes.t('NO_MESSAGE');
            return handlerInput.responseBuilder.speak(speechOutput)
                .addAudioPlayerStopDirective()
                .getResponse();
        },
};

const ErrorHandler = {
    canHandle() {
            return true;
        },
        handle(handlerInput, error) {
            console.log(`Error handled: ${error.message}`);

            return handlerInput.responseBuilder
                .speak(
                    'Sorry, I can\'t understand the command. Please say again.'
                )
                .reprompt(
                    'Sorry, I can\'t understand the command. Please say again.'
                )
                .getResponse();
        },
};

const UnsupportedIntent = {
    canHandle(handlerInput) {
            return handlerInput.requestEnvelope.request.type ===
                'IntentRequest' &&
                (handlerInput.requestEnvelope.request.intent.name ===
                    'AMAZON.ShuffleOnIntent' ||
                    handlerInput.requestEnvelope.request.intent.name ===
                    'AMAZON.ShuffleOffIntent' ||
                    handlerInput.requestEnvelope.request.intent.name ===
                    'AMAZON.LoopOnIntent' ||
                    handlerInput.requestEnvelope.request.intent.name ===
                    'AMAZON.LoopOffIntent' ||
                    handlerInput.requestEnvelope.request.intent.name ===
                    'AMAZON.NextIntent' ||
                    handlerInput.requestEnvelope.request.intent.name ===
                    'AMAZON.PreviousIntent');
        },
        handle(handlerInput) {
            const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
            const speechOutput = requestAttributes.t('UNHANDLED_MESSAGE');
            return handlerInput.responseBuilder.speak(unsupportedOutput)
                .getResponse();
        },
};

const skillBuilder = Alexa.SkillBuilders.custom();
exports.handler = skillBuilder
    .addRequestHandlers(
        LaunchRequest,
        HelpIntent,
        AnswerIntent,
        RepeatIntent,
        YesIntent,
        StopIntent,
        CancelIntent,
        NoIntent,
        PauseIntent,
        ResumeIntent,
        CancelIntent,
        UnsupportedIntent,
        SessionEndedRequest,
        UnhandledIntent
    )
    .addRequestInterceptors(LocalizationInterceptor)
    .addErrorHandlers(ErrorHandler)
    .lambda();
