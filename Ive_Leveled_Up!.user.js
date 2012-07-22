// ==UserScript==
// @name           I've Leveled Up!
// @namespace      http://imgineme.com/projects
// @description    Leveling system for Gaming.SE
// @include        http://gaming.stackexchange.com/*
// @include        http://meta.gaming.stackexchange.com/*
// @updateURL      http://imgineme.com/IveLeveledUp/Ive_Leveled_Up!.meta.js
// @downloadURL    http://imgineme.com/IveLeveledUp/Ive_Leveled_Up!.user.js
// @version        2.0
// ==/UserScript==
(function () {
	function $(id) {
		return document.getElementById(id);
	}
	function log(obj) {
		if(console.log) console.log(obj);
	}

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
	
	if(!this.GM_addStyle) {
		GM_addStyle = function (str) {
			document.head.appendChild($create('style', str));
		}
	}
	if (!this.GM_getValue || (this.GM_getValue.toString && this.GM_getValue.toString().indexOf("not supported")>-1)) {
		this.GM_getValue=function (key,def) {
			return localStorage[key] || def;
		};
		this.GM_setValue=function (key,value) {
			return localStorage[key]=value;
		};
		this.GM_deleteValue=function (key) {
			return delete localStorage[key];
		};
	}

	var domPrefixes = 'Webkit Moz O ms Khtml'.split(' ');
	// CSS Feature Checking
	function checkCSSFeature(name, prefixStyle) {
		// Modified from https://developer.mozilla.org/en/CSS/CSS_animations/Detecting_CSS_animation_support
		var styleString = name,
			prefixedString = prefixStyle || (styleString && styleString.length > 0 ? styleString.charAt(0) + styleString.substr(1,styleString.length - 1) : ''),
			elm = document.createElement('div');
			
		if( elm.style[styleString] ) return true;

		for( var i = 0; i < domPrefixes.length; i++ ) {
			if( elm.style[ domPrefixes[i] + prefixedString ] !== undefined ) {
				return domPrefixes[i];
			}
		}
		return false;
	}

	/**
	  *	Options object to hold both default and user configured options.
	  */
	var options = (function() {
		
		this.DEFAULT_NEWVERSION = 0.0,
		this.DEFAULT_UPDATECHECK = 0;
		this.DEFAULT_FADEBACK = true;
		
		this.newversion = GM_getValue("newver", this.DEFAULT_NEWVERSION),
		this.updateCheck = GM_getValue("updtTime", this.DEFAULT_UPDATECHECK);
		this.fadeBack = !checkCSSFeature('animationName', 'AnimationName') ? false : GM_getValue("fadeBack", this.DEFAULT_FADEBACK);
		
		return this;
	})();

	// Static variables
	var version = 2.0,
		rateVal = .316261,
		setLevels = 
			[
				0,1,3,5,7,10,12,15,18,20,25,30,35,40,45,50,60,75,82,92,100,108,116,125,
				150,175,200,225,250,275,300,325,350,375,400,450,500,550,600,650,700,
				800,900,1000,1100,1250,1337,1450,1600,1750,2000,2150,2300,2500,2750,
				3000,3250,3500,4000,4500,5000,5500,6000,6500,7000,7500,8000,8500,9000,
				9500,10000,11000,12000,13000,14000,15000,16000,17000,18000,19000,20000,
				22000,25000,29000,34000,39000,44000,49000,54000,60000,66000,72000,79000,
				86000,93000,100000,110000,120000,130000,140000,150000
			];

	// Icon for display next to levels
	function levelIcon (w,h) {
		if(!document.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#Shape", "1.0"))
			return "&#9728; "
		w = w || 128;
		h = h || w;
		w = parseInt(w) * .9, h = parseInt(h) * .9;
		return '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"\
				 width="'+w+'px" height="'+h+'px" viewBox="0 0 128 128" enable-background="new 0 0 128 128" xml:space="preserve" class="IveLeveledUpIcon">\
			<g>\
				<polygon fill="#21409A" points="64,10.893 14.104,3.251 14.104,78.691 64,124.749 113.896,78.691 113.896,3.251 	"/>\
				<polygon fill="#FFFFFF" points="64,21.336 25.833,16.974 25.833,75.797 64,111.026 102.167,75.797 102.167,16.974 	"/>\
				<polygon fill="#A7A9AC" points="64,21.336 64,111.026 25.833,75.797 25.833,16.974 	"/>\
				<path fill="#FFFFFF" d="M29.632,39.106c0,0,6.655,0.359,10.617-4.553s1.585-7.606,8.716-11.093c0,0-8.082,0.633-10.616,5.23\
					c-2.537,4.596-2.694,7.014-5.706,8.715C29.632,39.106,29.632,39.106,29.632,39.106z"/>\
			</g>\
			</svg>';
	}

	// Add styles for animations if they haven't been added already
	var _animationStylesCreated = false;
	function createAnimationStyles() {
		if(_animationStylesCreated) return;
		
		var support = checkCSSFeature('animationName', 'AnimationName');
		if(typeof support != 'string') support = "";
		else support = '-'+support.toLowerCase()+'-';
		GM_addStyle('@'+support+'keyframes fadeElOut {\
			from { opacity: 1; }\
			to { opacity: 0; }\
		}\
		@'+support+'keyframes fadeElIn {\
			from { opacity: 0; }\
			to { opacity: 1; }\
		}\
		.transitionOut {\
			'+support+'animation-name: fadeElOut;\
			'+support+'animation-duration: 1s;\
			'+support+'animation-delay: 8s;\
		}\
		.transitionIn {\
			'+support+'animation-name: fadeElIn;\
			'+support+'animation-duration: 1s;\
		}');
		
		_animationStylesCreated = true;
	}
		
	// Add stylesheet
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
	}\
	.IveLeveledUpIcon {\
		vertical-align: middle;\
	}');

		// Start User Level Object ---------------------------------------------------------------
	function UserLevel(_el, _expanded) {
		// Set base
		this.element = _el,
		this.expanded = _expanded,
		this.level = 1,
		this.rep = 0;
		var self = this;
		
		// Get text
		this.originalText = this.element.textContent;
		this.titleText = this.originalText;
		
		// Parse text
		if(this.originalText.indexOf('k') >= 0) {
			this.rep = parseInt(this.element.title.replace(/[^0-9]/g,''));
			this.titleText += " ("+this.rep+")";
		} else
			this.rep = parseInt(this.originalText.replace(/[^0-9]/g,''));
		
		// Calculate + Display
		this.calculateLevel()
			.display();
		
		// Animated fading
		if(options.fadeBack && !this.expanded) {
			createAnimationStyles();
			this._currentAniClass = "transitionOut"
			this._onOrig = false;
			this.element.addEventListener('animationend', function (e) {
				if(self._currentAniClass == 'transitionOut') {
					self._currentAniClass = 'transitionIn';
					if(self._onOrig) {
						self.calculateLevel()
							.display();
					} else {
						self.element.textContent = self.originalText;
					}
					self._onOrig = !self._onOrig;
					self.element.classList.remove('transitionOut');
					self.element.classList.add('transitionIn');
				} else {
					self._currentAniClass = 'transitionOut';
					self.element.classList.remove('transitionIn');
					self.element.classList.add('transitionOut');
				}
			}, false);
			this.element.classList.add('transitionOut');
			
		} else if (this.expanded) {
			// Setup listener for changes
			setInterval(function () { 
				if(self.element.textContent.match(/^\s*[0-9,]+\s*$/)) {
					self.calculateLevel()
						.display();
					GM_addStyle('#hlinks-user .reputation-score:before { width: '+self.percent+'%; }');
				}
			},1000);
		}
		
		return this;
	}
	UserLevel.prototype.calculateLevel = function () {
		// Find Current level
		var found = false;
		for(var i = 0, sll = setLevels.length; i < sll && !found; i++)
			if(setLevels[i] > this.rep) {
				this.level = i - 1;
				found = true;
			}
		
		// If not found, assume out of preset levels
		if(!found) { 
			// TODO: Calculate levels over 100
			this.level = 100,
			this.percent = 100,
			this.nextAt = 0,
			this.prevAt = 150000;
		} else {
			// Calculate next and previous levels
			this.nextAt = setLevels[this.level + 1],
			this.prevAt = setLevels[this.level];
			this.percent = (this.rep - this.prevAt)/(this.nextAt - this.prevAt) * 100;
		}
		
		return this;
		
		// Original equation below
		// return Math.floor(Math.sqrt(Math.max(21,exp)-21)*rateVal);
	};
	UserLevel.prototype.display = function () {
		// Setup text to display
		var prefix = levelIcon(window.getComputedStyle(this.element,null).fontSize)+"",
			suffix = "",
			parentClass = false;
		if(this.expanded) {
			suffix = " ("+this.originalText+")";
			parentClass = "rep-score-bar-link";
			this.title += "\n"+(this.nextAt-this.rep)+" reputation to next level";
		}
		
		// Replace element text
		this.element.innerHTML = prefix+this.level+suffix;
		this.element.title = this.titleText;
		if(parentClass) this.element.parentNode.classList.add(parentClass);
		
		return this;
	};
		// End User Level Object ---------------------------------------------------------------

	function init() {
		// Update
		try{ updateCheck(); }catch(e){}
		
		// Calculate for user
		if($('hlinks-user') && $('hlinks-user').getElementsByClassName('reputation-score').length > 0) {
			var userRep = $('hlinks-user').getElementsByClassName('reputation-score')[0];
			var userlvl = new UserLevel(userRep, true);
			GM_addStyle('#hlinks-user .reputation-score:before { width: '+userlvl.percent+'%; }');
		}
		
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
			rScores[r] = new UserLevel(rScores[r], false);
		
		// Calculate on user page
		var lui = $('large-user-info'),
			sui = $('small-user-info');
		if(lui)
			lui = new UserLevel(lui.getElementsByClassName('reputation')[0].getElementsByTagName('a')[0], false);
		if(sui)
			sui = new UserLevel(sui.getElementsByClassName('reputation')[0].getElementsByTagName('span')[0], false);
		
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
			href : "http://meta.gaming.stackexchange.com/a/5093/15643",
			textContent : "Change Log"
		});
		divHolder.appendChild(uplink);
		
		document.body.appendChild(divHolder);
	}
		// End Update Script -----------------------------------------------------------------
})();