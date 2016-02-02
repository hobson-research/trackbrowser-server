function DataViewHandler() {
	var _this = this; 
	
	var socket;
	var itemsWrapperEl; 
	
	var init = function() {
		// initialize socket.io connection with server
		socket = io();
		
		itemsWrapperEl = document.getElementById("items-wrapper");  
		
		// format all date to localtime
		_this.formatAllDate();
		
		attachEventHandlers();
		attachSocketMsgHandlers();   
	};
	
	var attachEventHandlers = function() {
		
	};
	
	var attachSocketMsgHandlers = function() {
		// in case of a new activity
		socket.on("new activity", function(activity) {
			console.log(activity); 
			
			addItem(activity); 
		});
	}; 
	
	var getLocaleStringFromGMTFormat = function(gmtString) {
		return new Date(gmtString).toLocaleString();  
	};
	
	var addItem = function(activity) {
		var newItemEl = document.createElement("div"); 
		var newItemInnerHTML = '<div class="desktop-2 columns"><p class="date">' + getLocaleStringFromGMTFormat(activity.date) + '</p></div><div class="desktop-1 columns"><p class="user">' + activity.userName + '</p></div><div class="desktop-2 columns"><p class="event-type">' + activity.type + '</p></div><div class="desktop-7 columns">';
		
		if (activity.type === "navigation") {
			newItemInnerHTML += '<p>User navigated to <a href="' + activity.url + '">' + activity.url + '</a>. </p>'; 
		} 
		
		else if (activity.type === "screenshot") {
			var screenshotURL = "http://52.32.246.19:8082/screenshot/" + activity.fileName;
			
			newItemInnerHTML += '<p>A screenshot was uploaded for page <a href="' + activity.url + '">' + activity.url + '</a>.</p><a href="' + screenshotURL + '" class="link-screenshot"><img src="' + screenshotURL + '" class="screenshot-thumbnail"/></a>'; 
		}
		
		else if (activity.type === "scroll") {
			newItemInnerHTML += '<p>User scrolled in <a href="' + activity.url + '">' + activity.url + '</a>.</p>'; 
		}
            
		else if (activity.type === "research-topic") {
			var researchTopicStr = ""; 
			
			if (activity.researchTypeKey === "other") {
				researchTopicStr = "Other (" + activity.researchTypeOtherReason + ")";	
			} else {
				researchTopicStr = activity.researchType; 
			}
			
			newItemInnerHTML += '<p>User has updated research topic. </p><h4>Research Topic</h4><span>' + researchTopicStr + '</span><h4>Research Companies</h4><span>' + activity.researchCompanies + '</span>';
		}

		else if (activity.type === "tracking-status") {
			var isTrackingOnStr;

			if (activity.isTrackingOn == 'true') {
				isTrackingOnStr = "on";
			} else {
				isTrackingOnStr = "off";
			}

			newItemInnerHTML += '<p>User has turned tracking status ' + isTrackingOnStr + '.</p>'
		}

			
		else if (activity.type === "file-download") {
			newItemInnerHTML += '<p>User has downloaded file ' + activity.fileName + '. </p>';
		} 
				
		else if (activity.type === "picture-selection") {
			newItemInnerHTML += '<p>Daily picture has been selected. </p><img src="' + activity.url + '" class="screenshot-picture-display"/>'; 
		}
		
		else {
			// if unknown type of activity is passed, do nothing
			return; 
		}
		
		newItemInnerHTML += '</div><div class="clear"></div>'; 
		
		// create DOM element
		newItemEl.classList.add("item"); 
		newItemEl.innerHTML = newItemInnerHTML; 
		
		// insert the new item
		itemsWrapperEl.insertBefore(newItemEl, itemsWrapperEl.childNodes[0]); 
	};
	
	_this.formatAllDate = function() {
		var activityItemDateEls = document.querySelectorAll("#browsing-data .item p.date"); 
		
		for (var i = 0; i < activityItemDateEls.length; i++) {
			activityItemDateEls[i].textContent = getLocaleStringFromGMTFormat(activityItemDateEls[i].textContent);
		}
	};
	
	init(); 
}

document.addEventListener("DOMContentLoaded", function() {
	// initialize dataViewHandler
	var dataViewHandler = new DataViewHandler(); 
});