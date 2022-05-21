/*
 * Copyright (C) 2019, Blackboard Inc.
 * All rights reserved.
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 *  -- Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 *
 *  -- Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 *
 *  -- Neither the name of Blackboard Inc. nor the names of its contributors
 *     may be used to endorse or promote products derived from this
 *     software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY BLACKBOARD INC ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL BLACKBOARD INC. BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

// Verify that we're in the integration iframe
if (!window.parent) {
    throw new Error('Not within iframe');
}

const integrationHost = window.__lmsHost;
const token = window.__token;
const launchUrl = window.__launchUrl;
const uuid = window.__uuid;
const learnUrl = window.__lmsHost;
const locale = window.__locale;
let messageChannel;
let panelId;
let modalId;

// Set up the window.postMessage listener for the integration handshake (for
// step #2)
window.addEventListener("message", onPostMessageReceived, false);

// (1) Send the integration handshake message to Learn Ultra. This notifies
// Learn Ultra that the integration has
// loaded and is ready to communicate.
window.parent.postMessage({
    "type": "integration:hello"
}, integrationHost);

function onPostMessageReceived(evt) {
    // Do some basic message validation.
    const fromTrustedHost = evt.origin === window.__lmsHost || evt.origin === integrationHost;
    if (!fromTrustedHost || !evt.data || !evt.data.type) {
        return;
    }

    if (evt.data.type === 'integration:hello') {
        // Store the MessageChannel port for future use
        messageChannel = new LoggedMessageChannel(evt.ports[0]);
        messageChannel.onmessage = onMessageFromUltra;

        // (3) Now, we need to authorize with Learn Ultra using the OAuth2 token
        // that the server negotiated for us
        messageChannel.postMessage({
            type: 'authorization:authorize',

            // This token is passed in through integration.ejs
            token: token
        });
    }

}

function onMessageFromUltra(message) {
    if (message.data.type === 'authorization:authorize') {
        onAuthorizedWithUltra();
    }

    if (message.data.type === 'portal:panel:response') {
        renderPanelContents(message);
    }

    if (message.data.type === 'portal:modal:response') {
        modalId = message.data.modalId;
    }

    if (message.data.type === 'portal:callback') {
        switch(message.data.callbackId) {

            case 'modal-popup-close':
                messageChannel.postMessage({
                    type: 'portal:modal:close',
                    modalId,
                });
                break;
            case 'course-details-test':
                openPanel ('full', localStorage.getItem('context'));
                break;
        }
    }

    if (message.data.type === 'portal:panel:response') {
        renderPanelContents(message);
    }

    if (message.data.type === 'event:event') {
        eventUltraMessageReceived(message);
    }
}

function onAuthorizedWithUltra() {
    console.log('Authorization was successful');

    messageChannel.postMessage({
        type: 'event:subscribe',
        subscriptions: ['click', 'route', 'portal:new', 'portal:remove'],
    });

    messageChannel.postMessage({
        type: "basenav:register",
        routeName: 'uefTest',
        displayName: 'UEF Test',
        initialContents: showBaseNav('UEF Test'),
    });

    messageChannel.postMessage({
        type: "course:detail:register",
        registrationName: 'UEF Test',
    });
}

const eventUltraMessageReceived = (msg) => {

    if (msg.data.routeName === 'base.organizations') {
        renderModal ('large', JSON.stringify(msg.data.routeData));
    }

    if (msg.data.routeName === 'base.calendar') {
        renderModal ('medium', JSON.stringify(msg.data.routeData));
    }

    if (msg.data.routeName === 'base.messages') {
        renderModal ('small', JSON.stringify(msg.data.routeData));
    }

    if (msg.data.routeName === 'base.courses.peek.course.outline.peek.gradebook-item.assessment') {
        renderModal ('medium', JSON.stringify(msg.data.routeData));
    }

    if (msg.data.routeName === 'base.courses.peek.course.outline.peek.books-and-tools') {
        openPanel ('full', JSON.stringify(msg.data.routeData));
    }

    if (msg.data.routeName === 'base.courses.peek.course.grades.peek.gradebook-item.assessment.peek.submission-grading') {
        openPanel ('small', JSON.stringify(msg.data.routeData));
    }

    if (msg.data.routeName === 'base.courses.peek.course.outline') {
        localStorage.setItem('context', JSON.stringify(msg.data.routeData));
    }

    if (msg.data.type === 'event:event' && msg.data.eventType === 'route' && msg.data.routeName === 'base.recentActivity') {
        showNotification('feature.base.stream.notification.bar.create.button');
        showNotification('components.directives.pagehelp.directive.link.helpIcon');
        showNotification('recentActivity.base.navigation.handleBase.link');
    }

    if (msg.data.eventType === 'portal:new' && msg.data.selector === 'course.banner.top') {
        showBanner(msg.data.portalId);
    }

    if (msg.data.eventType === 'portal:new' && msg.data.selector === 'base.integration' && msg.data.selectorData.routeName === 'uefTest') {
        localStorage.setItem('action', 'LOAD_BASENAV');
        localStorage.setItem('context', msg.data.selectorData.routeParameters);
        renderBaseNavContents(msg);
    }

    if (msg.data.eventType === 'portal:new' && msg.data.selector === 'course.outline.details') {
        showCourseDetails(msg.data.portalId, 'UEF Test', 'Click Here');
    }

}

function showCourseDetails (portalId, titleName, linkName) {
    messageChannel.postMessage({
        type: 'portal:render',
        portalId: portalId,
        contents: {
            tag: 'div',
            props: {
                className: 'uef--course-details--container',
            },
            children: [
                {
                    tag: 'button',
                    props: {
                        className: 'uef--button--course-details',
                        onClick: {
                            callbackId: 'course-details-test',
                            mode: 'sync',
                        }
                    },
                    children: [
                        {
                            tag: 'div',
                            props: {
                                className: 'uef--course-details--image'
                            },
                            children: [
                                {
                                    tag: 'img',
                                    props: {
                                        alt: 'Batman logo',
                                        src: 'https://img.icons8.com/material-sharp/1x/batman-emoji.png',
                                        height: 24,
                                        width: 24
                                    },
                                }
                            ]
                        },
                        {
                            tag: 'div',
                            props: {
                                className: 'uef--course-details--element'
                            },
                            children: [
                                {
                                    tag: 'div',
                                    props: {
                                        className: 'uef--course-details--name'
                                    },
                                    children: titleName
                                },
                                {
                                    tag: 'div',
                                    props: {
                                        className: 'uef--course-details--content'
                                    },
                                    children: [
                                        {
                                            tag: 'div',
                                            props: {
                                                className: 'uef--course-details--link'
                                            },
                                            children: linkName
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    });
}


function showBaseNav (linkName) {
    return {
        tag: 'ButtonLink',
        props: {
            style: {
                'minHeight': '52px',
                'display': 'flex',
                'flexDirection': 'row',
                'justifyContent': 'flex-start',
                'alignItems': 'center',
                'width': '100%',
                'paddingLeft': '12px',
            },
            to: 'uefTest',
            className: 'uef--base-nav-button',
        },
        children: [
            {
                tag: 'SvgIcon',
                props: {
                    className: 'svg-icon medium-icon default',
                    style: {
                        display: 'inline-block',
                        left: '12px',
                        fontSize: '18px',
                        lineHeight: '1.1',
                        marginRight: '14px',
                        textAlign: 'center',
                        verticalAlign: 'middle',
                    },
                    height: '24px',
                    width: '24px',
                    url: 'https://img.icons8.com/material-sharp/1x/batman-emoji.png',
                }
            },
            {
                tag: 'span',
                children: linkName,
            }
        ],
    }
}

function showNotification(id) {

    messageChannel.postMessage({
        type: 'portal:notification',
        selector: {
            type: 'notification:analytics:selector',
            value: id
        },
        contents: {
            tag: 'Notification',
            props: {
                size: 'small'
            },
            children: [
                {
                    tag: 'div',
                    children: [
                        {
                            tag: 'span',
                            props: {
                                style: {
                                    padding: '8px'
                                }
                            },
                            children: 'UEF Test Notification'
                        }
                    ]
                }
            ]
        }
    });
}

function showBanner (portalId) {
    var launchUrl2 = launchUrl + "?action=SHOW_BANNER" + "&uuid=" + uuid + "&learn_url=" + learnUrl + "&locale=" + locale + "&data=" + encodeURIComponent (localStorage.getItem('context'));
    messageChannel.postMessage({
        type: 'portal:render',
        portalId: portalId,
        contents: {
            tag: 'div',
            props: {
                style: {
                    backgroundColor: '#c56fd5'
                }
            },
            children: [
                {
                    tag: 'iframe',
                    props: {
                        src: launchUrl2,
                        style: {
                            flex: '1 1 auto',
                            width: '100%',
                        }
                    }
                }
            ]
        }
    });
}

function openPanel(panelSize, data) {
    localStorage.setItem('context', data);
    localStorage.setItem('action', 'SHOW_PANEL');

    messageChannel.postMessage({
        type: 'portal:panel',
        correlationId: 'panel-1',
        panelType: panelSize,
        panelTitle: 'UEF Demo',
        attributes: {
            onClose: {
                callbackId: 'panel-1-close',
            },
        },
    });
}

function renderBaseNavContents(message) {
    var launchUrl2 = launchUrl + '?data=' + encodeURIComponent(localStorage.getItem('context')) + "&uuid=" + uuid + "&action=" + localStorage.getItem('action') + "&learn_url=" + learnUrl + "&locale=" + locale;
    panelId = message.data.portalId;
    messageChannel.postMessage({
        type: 'portal:render',
        portalId: message.data.portalId,
        contents: {
            tag: 'span',
            props: {
                style: {
                    display: 'flex',
                    height: '100%',
                    width: '100%',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    justifyContent: 'stretch',
                },
            },
            children: [{
                tag: 'iframe',
                props: {
                    style: {
                        flex: '1 1 auto',
                    },
                    src: launchUrl2,
                },
            }]
        },
    });
}

function renderPanelContents(message) {
    if (message.data.correlationId === 'panel-1') {
        var launchUrl2 = launchUrl + '?data=' + encodeURIComponent(localStorage.getItem('context')) + "&uuid=" + uuid + "&action=" + localStorage.getItem('action') + "&learn_url=" + learnUrl + "&locale=" + locale;
        panelId = message.data.portalId;
        messageChannel.postMessage({
            type: 'portal:render',
            portalId: message.data.portalId,
            contents: {
                tag: 'span',
                props: {
                    style: {
                        display: 'flex',
                        height: '100%',
                        width: '100%',
                        flexDirection: 'column',
                        alignItems: 'stretch',
                        justifyContent: 'stretch',
                    },
                },
                children: [{
                    tag: 'iframe',
                    props: {
                        style: {
                            flex: '1 1 auto',
                        },
                        src: launchUrl2,
                    },
                }]
            },
        });
    }
}

function renderEmbeddedPanelContents (launchUrl, portalId)
{
    const contentsToSend = {
        tag: 'div',
        props: {
            style: {
                position: 'absolute',
                inset: '20px',
            }
        },
        children: [{
            tag: 'iframe',
            props: {
                src: launchUrl,
                style: {
                    border: 'none',
                    flex: '1 1 auto',
                    width: '100%',
                    height: '100%'
                }
            },
        }]
    }

    messageChannel.postMessage({
        "type": "portal:render",
        "portalId": portalId,
        "contents": contentsToSend,
    });
}

function renderModal (modalSize, data)
{
    messageChannel.postMessage({
        type: 'portal:modal',
        modalId: 'modal-1',
        contents: {
            tag: 'Modal',
            props: {
                width: modalSize
            },
            children: [
                {
                    tag: 'ModalHeader',
                    props: {},
                    children: [
                        {
                            tag: 'img',
                            props: {
                                src: "/bbcswebdav/institution/icons/ueftest_top.png"
                            },
                        }]
                },
                {
                    tag: 'ModalBody',
                    children: [
                        {
                            tag: 'div',
                            props: {
                                style: {
                                    marginLeft: '0',
                                    marginTop: '0',
                                    marginBottom: '0',
                                    marginRight: '0',
                                },
                            },
                            children: [
                                {
                                    tag: 'iframe',
                                    props: {
                                        style: {
                                            backgroundColor: '#c56fd5',
                                            width: '100%',
                                            height: '400px',
                                            border: 0,
                                        },
                                        src: launchUrl + "?action=SHOW_MODAL" + "&uuid=" + uuid + "&learn_url=" + learnUrl+ "&locale=" + locale + "&data=" + encodeURIComponent (data)
                                    }
                                }]
                        }]
                },
                {
                    tag: 'ModalFooter',
                    children: [
                        {
                            tag: 'button',
                            props: {
                                onClick: {
                                    callbackId: 'modal-popup-close',
                                    mode: 'sync'
                                },
                                key: 'idk',
                                style: {
                                    marginBottom: '0',
                                    marginTop: '0'
                                },
                                className: 'uef--button'
                            },
                            children: 'Close'
                        }
                    ]
                }
            ]
        },
    });
}

// Sets up a way to communicate between the iframe and the integration script
window.addEventListener('storage', onEventFromIframe);

function onEventFromIframe(evt) {
    if (evt.key !== 'event') {
        return;
    }

    const message = JSON.parse(evt.newValue);
    switch (message.type) {
        // Handles when the user clicks the "close panel" button
        case 'demo:closePanel':
            messageChannel.postMessage({
                type: 'portal:panel:close',
                id: panelId,
            });
            break;
    }
}

/**
 * A MessageChannel-compatible API, but with console logging.
 */
class LoggedMessageChannel {
    onmessage = () => {
        /* */
        console.log('test');
    };

    constructor(messageChannel) {
        this.messageChannel = messageChannel;
        this.messageChannel.onmessage = this.onMessage;
    }

    onMessage = (evt) => {
        console.log(`[UEF] From Learn Ultra:`, evt.data);
        this.onmessage(evt);
    };

    postMessage = (msg) => {
        console.log(`[UEF] To Learn Ultra`, msg);
        this.messageChannel.postMessage(msg);
    }
}
