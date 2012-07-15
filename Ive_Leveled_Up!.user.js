// ==UserScript==
// @name           I've Leveled Up!
// @namespace      http://imgineme.com/projects
// @description    Leveling system for Gaming.SE
// @include        http://gaming.stackexchange.com/*
// @include        http://meta.gaming.stackexchange.com/*
// @version        1.0
// ==/UserScript==

// Shortcut for document.createElement
function $create(type, attributes) {
	var node;
	if(type == 'textNode') {
		node = document.createTextNode(attributes);
	} else {
		node = document.createElement(type);
		if(typeof attributes == 'string') {
			node.textContent = attributes;
		} else {
			for (var attr in attributes){
				if(attr == "textContent") {
					node.textContent = attributes[attr];
				} else if (attr == "className") {
					node.className = attributes[attr];
				} else if (attr == "innerHTML") {
					node.innerHTML = attributes[attr];
				} else if (attributes.hasOwnProperty(attr)) {
					node.setAttribute(attr, html_entity_decode(attributes[attr]));
				}
			}
		}
	}
	return node;
}
//	Decoed HTML Entities
function html_entity_decode(str) {
	//jd-tech.net
	var tarea = $create('textarea');
	tarea.innerHTML = str;
	return tarea.value;
}
// Simple xmlhttpRequest GET shortcut
function get(url, cb, err) {
	cb = cb || function () {};
	err = err || function () {};
	GM_xmlhttpRequest({
		method: "GET",
		url: url,
		onload: function(xhr) { cb(xhr); },
		onerror: function(xvr) { err(xvr); }
	});
}

/**
  *	Options object to hold both default and user configured options.
  */
var options = (function() {
	
	this.DEFAULT_NEWVERSION = 0.0,
	this.DEFAULT_UPDATECHECK = 0;
	
	this.newversion = GM_getValue("newversion", this.DEFAULT_NEWVERSION),
	this.updateCheck = GM_getValue("updateCheck", this.DEFAULT_UPDATECHECK);
	
	return this;
})();


var $ = document.getElementById,
	log = console.log || function () {},
	version = GM_info.script.version,
	
	rateVal = .316261;

GM_addStyle('\
.rep-score-bar-link {\
	display: inline-block;\
	height: 13px;\
	margin: 0px 4px;\
}\
#hlinks-user .reputation-score {\
	position: relative;\
	display: inline-block;\
	width: 120px;\
	text-align: center;\
	font-size: 10px;\
	line-height: 12px;\
	vertical-align: top;\
}\
#hlinks-user .reputation-score:after,\
#hlinks-user .reputation-score:before {\
	content: "";\
	display: block;\
	width: 120px;\
	position: absolute;\
	left: 0px;\
	top: 100%;\
	height: 5px;\
}\
#hlinks-user .reputation-score:after {\
	border-radius: 2px;\
	border: 1px solid #999999;\
	box-shadow: 0px 1px 0px #000000;\
	vertical-align: text-bottom;\
	background-color: rgba(0,0,0,0.9);\
}\
#hlinks-user .reputation-score:before {\
	margin: 1px;\
	z-index: 2;\
	background-image: -moz-linear-gradient(to bottom, #66AAFF, #2F80FF);\
	background-image: -webkit-linear-gradient(top, #66AAFF, #2F80FF);\
	background-image: linear-gradient(to bottom, #66AAFF, #2F80FF);\
}\
#LevelUpNewVer {\
	position: absolute;\
	left: 50%;\
	top: 37px;\
	background-color: rgba(0,0,0,0.6);\
	color: #FFFFFF;\
	width: 300px;\
	margin-left: -205px;\
	padding: 5px;\
	border: 1px solid rgba(255,255,255,0.7);\
	border-radius: 3px;\
}\
#LevelUpNewVer span {\
	display: block;\
}\
#LevelUpNewVer a {\
	display: inline-block;\
	padding: 4px 10px 0px;\
}');

function calcLevel(exp) {
	return Math.floor(Math.sqrt(Math.max(21,exp)-21)*rateVal);
}

function calcExp(lvl) {
	return Math.round(Math.pow(lvl/rateVal,2)+21);
}

function repTilNext(exp) {
	var lvl = calcLevel(exp);
	var nextAt = calcExp(lvl+1);
	var prevAt = calcExp(lvl);
	var perc = (exp-prevAt)/(nextAt - prevAt) * 100;
	return {
		'level'   : lvl,
		'nextAt'  : nextAt,
		'prevAt'  : prevAt,
		'percent' : perc
	};
}

function init() {
	// Calculate for user
	var userRep = $('hlinks-user').getElementsByClassName('reputation-score')[0];
	var userlvl = convertRep(userRep, true);
	setInterval(function () { 
		if(userRep.textContent.match(/^\s*[0-9,]+\s*$/)) {
			userlvl = convertRep(userRep, true);
			GM_addStyle('#hlinks-user .reputation-score:before { width: '+userlvl.percent+'%; }');
		}
	},1000);
	GM_addStyle('#hlinks-user .reputation-score:before { width: '+userlvl.percent+'%; }');
	
	// We're on a page where the level calculation will be wrong
	if(location.href.match(/users(\?.*)?$/) && location.href.indexOf('filter=all') < 0) return;
	
	// Calculate for others
	var ui = document.getElementsByClassName('user-info'),
		qs = document.getElementsByClassName('question-summary'),
		rScores = [];
	for(var i = 0, uil = ui.length; i < uil; i++)
		Array.prototype.push.apply(rScores, ui[i].getElementsByClassName('reputation-score'));
	for(var i = 0, qsl = qs.length; i < qsl; i++)
		if(rScores.lastIndexOf(qs[i].getElementsByClassName('reputation-score')[0]) < 0)
			Array.prototype.push.apply(rScores, qs[i].getElementsByClassName('reputation-score'));
	
	for(var r = 0, rl = rScores.length; r < rl; r++)
		convertRep(rScores[r], false);
	
	// Calculate on user page
	var lui = $('large-user-info'),
		sui = $('small-user-info');
	if(lui)
		convertRep(lui.getElementsByClassName('reputation')[0].getElementsByTagName('a')[0], false);
	if(sui)
		convertRep(sui.getElementsByClassName('reputation')[0].getElementsByTagName('span')[0], false);
	
	// Update
	updateCheck();
}

function convertRep(el, expanded) {
	var irep = 0,
		frep = el.textContent;
	if(!frep) log(el);
	if(frep.indexOf('k') >= 0) {
		irep = parseInt(el.title.replace(/[^0-9]/g,''));
		frep += " ("+irep+")";
	} else
		irep = parseInt(frep.replace(/[^0-9]/g,''));
	
	var prefix = "&#9728; ",
		suffix = "",
		parentClass = "",
		title = frep+" reputation",
		userlvl = repTilNext(irep);
	if(expanded) {
		prefix = "Level ";
		suffix = " ("+frep+" rep)";
		parentClass = " rep-score-bar-link";
		title += "\n"+(userlvl.nextAt-irep)+" reputation to next level";
	}
	
	el.innerHTML = prefix+userlvl.level+suffix;
	el.title = title;
	el.parentNode.className += parentClass;
	return userlvl;
}

init();

	// Start Update Script ---------------------------------------------------------------
// Fetches script homepage to check for updates
function updateCheck() {
	if (options.newversion > parseFloat(version) && options.newversion != 0.0) {
		verNotice();
	} else if (Date.now() - options.updateCheck >= 86400000 || options.updateCheck === 0) {
		GM_setValue("updtTime", Date.now().toString());
		get("http://imgineme.com/IveLeveledUp/Ive_Leveled_Up!.meta.js", chckAgainst);
	}
}
// Checks the version number on the script homepage against this version number and informs if a newer version is available
function chckAgainst(response) {
	var newest = parseFloat(/\/\/ @version.+/.exec(response.responseText)[0].replace(/\/\/ @version\s+/, ''));
	// Creates an install link if a newer version is available
	if (newest > version) {
		GM_setValue("newver", "" + newest);
		verNotice();
	}
}
// Displays a notification about a new update
function verNotice() {
	var divHolder = $create('div', {
		id : "LevelUpNewVer"
	});
	
	divHolder.appendChild($create("span", {
		textContent : 'A newer version of "I\'ve Leveled Up!" is available.',
		className : "newVerAvailable"
	}));
	
	var uplink = $create("a", {
		href : "http://imgineme.com/IveLeveledUp/Ive_Leveled_Up!.user.js",
		textContent : "Update"
	});
	divHolder.appendChild(uplink);
	
	uplink = $create("a", {
		href : "http://imgineme.com/project/levelup",
		textContent : "Change Log"
	});
	divHolder.appendChild(uplink);
	
	document.body.appendChild(divHolder);
	GM_addStyle("#leftnav { padding-top: 80px; } ");
}
	// End Update Script -----------------------------------------------------------------
