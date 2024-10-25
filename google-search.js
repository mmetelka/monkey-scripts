// ==UserScript==
// @name         Google Search
// @namespace    https://github.com/mmetelka
// @version      1.0
// @description  Google search results opening by shortcuts.
// @author       Miloslav Metelka
// @license      MIT
// @match        https://www.google.com/*
// @grant        none
// @require      https://cdnjs.cloudflare.com/ajax/libs/mousetrap/1.6.5/mousetrap.js
// ==/UserScript==

(function() {
    'use strict';

    const mlog = (msg) => {
        console.log("mlog:" + msg);
    }
    mlog("functions init");

    const mlogArray = (arr, arrName = "") => {
        arr.forEach((item, i) => { mlog(arrName + "[" + i + "]: " + item); });
    }

    /**
     * Open new browser tab with the givewn url.
     * @param {string} url url to open in the new tab
     */
    const newTab = (url) => {
        mlog("  new tab with url=" + url);
        window.open(url, "_blank");
    }

    /**
     * Redirect current tab to the given url.
     * @param {string} url url to open in the new tab
     */
    const redirectTo = (uri) => {
        mlog("  redirect to uri=" + uri);
        window.location.href = uri;
    }

   /**
     * Dispatch given mouse event.
     * @param {string} type of the mouse event - "mouseover", "mousedown", "mouseup", "click"
     */
    const triggerMouseEvent = (node, eventType) => {
        const event = document.createEvent('MouseEvents');
        event.initEvent(eventType, true, true);
        node.dispatchEvent(event);
    }

   /**
     * Click the given node programatically.
     * @param {Object} node which should be clicked programatically.
     */
    const clickNode = (node) => {
        if (node) {
            triggerMouseEvent(node, "mouseover");
            triggerMouseEvent(node, "mousedown");
            triggerMouseEvent(node, "mouseup");
            triggerMouseEvent(node, "click");
        }
    }

   /**
     * Find node by given selector in the whole document.
     * @param {Object} selector to find the node.
     */
    const findSelectorNode = (selector) => {
        return document.querySelector(selector);
    }

   /**
     * Find node by given selector in the whole document.
     * @param {Object} selector to find the node.
     * @param {int} n 0-based index of first node to return.
     * @param {int} count number of nodes to return.
     * @param {Object} filter additional filter to apply on each found node.
     * @return array with count size filled with found nodes satisfying filter.
     */
    const findXPathNodes = (xPath, n, count, filter = null) => {
        const xPathResult = document.evaluate(xPath, document, null, XPathResult.ANY_TYPE, null);
        let ret = new Array(count);
        count += n;
        for (let i = 0; i < count;) {
            let node = xPathResult.iterateNext();
            if (node && filter && !filter(node)) {
                continue;
            }
            if (i >= n) {
                ret[i - n] = node;
            }
            i++;
        }
        return ret;
    }

    /**
     * Find n-th parent of the given element.
     * @param {Object} element to search parent(s) for.
     * @param {int} n n-th parent element to return.
     * @return n-th parent element (can be null for top of tree).
     */
    const nthParent = (elem, n) => {
        for (; elem && n > 0; n--) {
            elem = elem.parentElement;
        }
        return elem;
    }
    let nodesRefresher = null; // Assign function with "newSize" arg to refresh the "nodes" var.
    let nodes = null;
    let focusedNodeIndex = -1;
    let focusedNode = null;
    let focusedNodeOrigBackground = null;

    const updateFocusedNode = (newFocusedNode) => {
        if (focusedNode) {
            focusedNode.style.backgroundColor = focusedNodeOrigBackground;
        }
        focusedNode = newFocusedNode;
        focusedNodeOrigBackground = newFocusedNode.style.backgroundColor;
        newFocusedNode.focus();
        newFocusedNode.style.backgroundColor = "#fcff5c";
    }

   /**
     * Focus node with given 0-based index.
     * @param {int} n 0-based index of node to focus. Nodes will be refreshed if there's not enough nodes.
     */
    const focusNode = (n) => {
        n = Math.max(n, 0);
        if (!nodes || n >= nodes.length) { // Try to fetch further nodes
            nodesRefresher(Math.max(n << 1, 5));
        }
        const newFocusedNode = nodes[n];
        if (newFocusedNode != null) {
            focusedNodeIndex = n;
            updateFocusedNode(newFocusedNode);
        }
    }


    mlog("start");

    const foundItemsXPath = "//div[@class='yuRUbf']//a[@href]";
    let disabledPeopleAskParentNodes = null;
    const filter = (node) => {
        mlog("  filter: node.href=" + node.href);
        let excluded = false;
        if (disabledPeopleAskParentNodes) {
            for (const disabledNode of disabledPeopleAskParentNodes) {
                if (disabledNode.contains(node)) {
                    mlog("    filter: skipped - contained in disabledNode=" + disabledNode);
                    return false;
                }
            }
        }
        return !node.href?.startsWith("https://translate.google.com/");
    }
    const refreshNodes = (newSize) => {
        const peopleAskNodes = document.querySelectorAll("div[aria-level='2']");
        mlogArray(peopleAskNodes, "peopleAskNodes");
        disabledPeopleAskParentNodes = Array.from(peopleAskNodes, (elem) => { return nthParent(elem, 3); });
        mlogArray(disabledPeopleAskParentNodes, "disabledPeopleAskParentNodes");
        nodes = findXPathNodes(foundItemsXPath, 0, newSize, filter);
        mlogArray(nodes, "xpathNodes");
    }
    nodesRefresher = refreshNodes;

    const editQuestion = (cursorPosFunc) => {
        const qElem = document.querySelector("textarea[name='q']");
        if (qElem) {
            if (cursorPosFunc) {
                cursorPosFunc(qElem);
            }
//            qElem.scrollIntoView({behavior: "smooth"});
            qElem.scrollIntoView(true);
            qElem.focus();
        }
    }

    Mousetrap.bind(["h"], () => { focusNode(0); }); // Home
    Mousetrap.bind(["j"], () => { focusNode(focusedNodeIndex+1); }); // Down
    Mousetrap.bind(["k"], () => { focusNode(focusedNodeIndex-1); }); // Up
    Mousetrap.bind(["l"], () => { if (focusedNode?.href) newTab(focusedNode.href); }); // Open focused link
    Mousetrap.bind(["a"], () => { editQuestion(qElem => { const end = qElem.value.length; qElem.setSelectionRange(end, end); }); }); // Append to question
    Mousetrap.bind(["i"], () => { editQuestion(qElem => { qElem.setSelectionRange(0, 0); }); }); // Insert at question beginning
    Mousetrap.bind(["s"], () => { editQuestion(qElem => { qElem.setSelectionRange(0, qElem.value.length); }); }); // Select question
    focusNode(0);

    mlog("end");

})();
