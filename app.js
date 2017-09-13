var restify = require('restify');
var builder = require('botbuilder');

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

// Listen for messages from users 
server.post('/api/messages', connector.listen());

// Receive messages from the user and respond by echoing each message back (prefixed with 'You said:')
var bot = new builder.UniversalBot(connector, function (session) {
});
var luisModelUrl = 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/03fcf30b-359a-41d2-96ad-903550efc92f?subscription-key=520f536a0ef143c8b67dc72863d89319&timezoneOffset=0&verbose=true&q=';

// Luis Recognizer Configuration
var recognizer = new builder.LuisRecognizer(luisModelUrl);
recognizer.onFilter(function (context, result, callback) {
    // Could also do a threshold check here, if the score is > 0.7 then just return this result and 
    // set the score to 1.0 to hotwire the default recognition 1.0 threshold (if a score is >=1.0 then
    // this will be returned as the "winning" intent and further recognizers aren't called)
    bot.loadSession(context.message.address, function (err, session) {
        if (result.score) {
            if (result.score < 0.5) {
                session.conversationData.intentsFirstResults = {
                    "intent" : result.intent,
                    "score" : result.score
                };
                callback(null, { score: 0.5, intent: 'None' });
            } else {
                callback(null, { score: result.score, intent: result.intent});
            }
        } else {
        }
    });
  });
bot.recognizer(recognizer);

// ------- Knowledge base start ---------
var bluetoothKnowledgeBase = {
    'iphone' : "From ios9, You can turn on the bluetooth by select 'Bluetooth' option in settings menu. If you are still using ios8 or below, please upgrade your system.",
    'moto' :  "Settings menu can be found in 'Motorola support', restart bluetooth in there.",
    'general' : "Generally.....There is no bluetooth option on all the other phones."
}

var wifiKnowledgeBase = {
    'iphone' : "For IOS, wifi can be turned on and off in settings page.",
    'moto' :  "For motorola phones, wifi can be turned on by swiping down panel in the screen.",
    'general' : "Generally.....There is no wifi option on all the other phones."
}
// ------- Knowledge base end ----------

bot.dialog('none', [
    function (session) {
        var msg = new builder.Message(session);
        msg.attachmentLayout(builder.AttachmentLayout.carousel)
        msg.attachments([
            new builder.HeroCard(session)
                .title("Bluetooth Chat")
                .subtitle("Help you to turn on Bluetooth")
                .text("Feel free to type your problems!")
                .images([builder.CardImage.create(session, 'http://s2.sinaimg.cn/mw690/002stutGgy70mgl0S9X11&690')])
                .buttons([
                    builder.CardAction.imBack(session, "Bluetooth Chatting", "Bluetooth")
                ]),
            new builder.HeroCard(session)
                .title("Wifi Chat")
                .subtitle("Help you with wifi")
                .text("Let me give you guidelines!")
                .images([builder.CardImage.create(session, 'http://img1.fjtv.net/material/news/img/2015/04/037460229a4cdd77b3da5dfe00d3450a.jpg')])
                .buttons([
                    builder.CardAction.imBack(session, "Wifi Chatting", "Wifi")
                ])
        ]);
        session.endDialog(msg);
    }
]).triggerAction({
    matches: 'None'
});

bot.dialog('bluetooth chatting', [
    function (session) {
        builder.Prompts.text(session, 'Welcome to bluetooth chat. Please descibe your question below.');
    },
    function (session, results) {
        if (results.response.includes("wifi")) {
            session.send('It seems that you want to switch to wifi chat. I will do that for you.');
            session.beginDialog('wifi chatting');
        } else {
            session.beginDialog('bluetooth');
        }
    }
]).triggerAction({
    matches: 'Bluetooth Chatting'
});

bot.dialog('wifi chatting', [
    function (session) {
        builder.Prompts.text(session, 'Welcome to wifi chat. Please descibe your question below.');
    },
    function (session) {
        if (session.message.text.includes("tooth")) {
            session.send('It seems that you want to switch to bluetooth chat. I will do that for you.');
            session.beginDialog('bluetooth chatting');
        } else {
            session.beginDialog('wifi');
        }
    }
]).triggerAction({
    matches: 'Wifi Chatting'
});

bot.dialog('bluetooth', [
    function(session, args) {
        var modelEntity = builder.EntityRecognizer.findEntity(args.intent.entities, "device_model");
        if (modelEntity) {
            if (bluetoothKnowledgeBase[modelEntity["entity"]]) {
                session.send(bluetoothKnowledgeBase[modelEntity["entity"]]);
                session.endConversation();
                // Todo: Are you satisfied with the service? Please rate:
            } else {
                session.send(bluetoothKnowledgeBase["general"]);
                session.endConversation();
                // Todo: What's other tasks you want to execute?
            }
        } else {
            session.beginDialog('supplementDeviceModel', args);
        }
    },
    function(session, results) {
        if (bluetoothKnowledgeBase[results.response]) {
            session.send(bluetoothKnowledgeBase[results.response]);
            session.endConversation();
            // Todo: Are you satisfied with the service? Please rate:
        } else {
            session.send(bluetoothKnowledgeBase["general"]);
            session.endConversation();
            // Todo: What's other tasks you want to execute?
        }
    }
]).triggerAction({
    matches: 'Bluetooth'
});

// Device input 
bot.dialog('deviceInputHelp', function(session, args, next) {
    var msg = "Help Topic: Device Input - Type your device model. You can input either iphone, moto, or any other brands.";
    session.endDialog(msg);
});

bot.dialog('supplementDeviceModel', [
    function (session) {
        builder.Prompts.text(session, 'Thanks. However we need your device model to give you advices. Please input below');
    },
    function (session, results) { 
        session.endDialogWithResult(results);
    }
]).beginDialogAction('helpAction', 'deviceInputHelp', 
{ matches: /^help$/i }).endConversationAction(
    "endChat", "ok. goodbye.",
    {
        matches: /^cancel$|^goodbye$/i,
    }
);


bot.dialog('wifi', [
    function(session, args) {
        var modelEntity = builder.EntityRecognizer.findEntity(args.intent.entities, "device_model");
        if (modelEntity) {
            if (wifiKnowledgeBase[modelEntity["entity"]]) {
                session.send(wifiKnowledgeBase[modelEntity["entity"]]);
                session.endConversation();
                // Todo: Are you satisfied with the service? Please rate:
            } else {
                session.send(wifiKnowledgeBase["general"]);
                session.endConversation();
                // Todo: What's other tasks you want to execute?
            }
        } else {
            session.beginDialog('supplementDeviceModel', args);
        }
    },
    function(session, results) {
        if (wifiKnowledgeBase[results.response]) {
            session.send(wifiKnowledgeBase[results.response]);
            session.endConversation();
            // Todo: Are you satisfied with the service? Please rate:
        } else {
            session.send(wifiKnowledgeBase["general"]);
            session.endConversation();
            // Todo: What's other tasks you want to execute?
        }
    }
]).triggerAction({
    matches: 'Wifi'
});

