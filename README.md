# Demo Uef Tool
This is a simple LTI 1.3 tool that demonstrates a variety of options in UEF and a basic LTI 1.3 launch.

## Configuration
To configure, goto the dev portal and configure a new LTI 1.3 application.  

Note that if your host URL is different for your tool, replace https://mylearn.int.bbpd.io:8092 throughout and update the config.ts 
as noted below.  You will then need to update the cert files or switch to using http depending on your configuration.

- Domain: mylearn.int.bbpd.io
- Login url: https://mylearn.int.bbpd.io:8092/login
- Redirect url: https://mylearn.int.bbpd.io:8092/launches
- Jwks url: https://mylearn.int.bbpd.io:8092/jwks -- this is not used for this application

NOTE that for UEF to function, you must mark your application as a premium application with UEF access.  You may need to
open a ticket with Blackboard for this to be done.

Then goto the config.ts file and update the values for your registered application.  

Then go into Learn and register the REST API integration and add the LTI domain.  You can add placements for LTI and UEF.

- LTI: https://mylearn.int.bbpd.io:8092/lti -- add as a system placement
- UEF: http://mylearn.int.bbpd.io:8092/uef -- add a a UEF placement

## Build & Run Instructions
- npm ci
- npm run build
- npm run start

## Testing it Out

#### UEF: The following will be demonstrated:
- When you login, you will see an example of UEF added to the base navigation.
- You will also see an example of a notification added the help icon and the Recent Activity links shown in rotating order.
- When you click on Organizations, you will see an example of a large modal popup.
- When you click on Calendar, you will see an example of a medium modal popup.
- When you click on Messages, you will see an example of a small modal popup.
- When you click on an Ultra course, you will see an example of a banner added to the top.
- You will also see an example of a course detail menu item added which opens a large peek panel.
- In the course when you click on Books & Tools, you will see an example of a large peek panel popup as well.
- In the course when you click on an assignment, you will see an example of a medium model popup.
- And in the course when you goto grade the activity for a student, you will see the example of a small peek panel.
- When you goto Recent Activity, you will see an example of a notification added to the Create button.

Note that the data context is displayed demonstrating how the context keys can be passed and used as required for processing.

Note that the message are logged in the console as the interactions happen.  Open it up and watch the chatter as you click around.

Note that this is not an exhaustive demonstration of capabilities.  Others include adding originality reporting integration, 
proctoring integration, LTI launches, help overrides, and others.

#### LTI: The following will be demonstrated:
- When you goto tools & click on the placement you added, the jwt payload will be displayed.  You can configure other placement
types and see the same.

## Is it Running?
Hit https://mylearn.int.bbpd.io:8092 in your browser.


