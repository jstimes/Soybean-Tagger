//The Raphael drawing context
var paper;

/*
 Main data structure storing all data regarding drawn paths
 For each disease with a path, there will be a property with that disease ID 
	e.g. if there is a path for disease 'a', paths.a will be defined
 Each of these properties is an array of more objects
	e.g. paths.a = [{...}, {...},...]
 One object in the array per path drawn for the given disease 
 Inside this object there are two properties:
	pathObj: references the Raphael path object 
		- this reference is saved so it's fill can be toggled or 
			so it can be removed 
	pathArr: Stores array of path coordinates (SVG style)
		so they can be included in output file 
 */
var paths = {};

//Stores the array of path coordinates for the path currently being drawn 
var path = [];

/*
 Represents a stack of path ID's, where the top of the stack 
  was the id of the last disease with a path drawn 
  Only used for the 'undo' feature
*/
var pathStack = [];

//Flag indicating whether the area inside paths should be filled with color or not 
var fill = false;

//Flag indicating whether the user is holding down the left mouse button or not 
var mouseDown = false;

//Stores the id of the currently selected disease
var selected = "Healthy";

//Stores color to be used with currently selected disease 
var selectedColor = "";

//Flag indicating if 'Healthy' is the only identified disease (i.e. no identified diseases)
var HealthyIdentified = true;

//Stores filename of image currently being used 
var curImageUrl = "";

//Width of path lines
var STROKE_WIDTH = 5;

//Constants for id's of the two html lists
var OP_LIST_ID = "opList";
var ID_LIST_ID = "idList";

//Dimension of drawing canvas:
var CANVAS_SIZE = 500;

//Default color options for marking:
var DEFAULT_COLORS = [
	"#800080",
	"#00FFFF",
	"#2222EE",
	"#74BAEC",
	"#FF00FF",
	"#CE93D8",
	"#FF0000",
	"#FF00FF",
	"#AAAAAA"
];

//If site structure is changed, this needs to be changed
var BASE_PATH = "https://baskar-group.me.iastate.edu/soybean_tagger/api/";
var GET_PROGRESS_ENDPOINT = "getProgress.php";
var GET_NEXT_IMAGE_ENDPOINT = "getNextImage.php";
var UPLOAD_ENDPOINT = "upload.php";
var GET_DISEASES_ENDPOINT = "getDiseases.php";
//var IMAGES_URL = "https://baskar-group.me.iastate.edu/soybean_tagger_images";



// //Will store all image names once a request to the above script is made
// // to get the names
// var imageFileNames = [];

//Stores index of current image being marked (based on above array)
var imageIndex = -1;
var curImageId = -1; 

var username;

		
//If you're unfamiliar with jQuery,
// this is essentially the document.onReady callback 
// Does initialization stuff and sets dom element event handling
// (trying to attach events before this is called may not work)
$( function() {
	
	//Begins by loading image filepaths from server 
	// Once loaded, loads first image and initializes drawing context
	//getImageNames();
	
	getDiseases();

	//Sets the two lists to be sortable
	// Basically allows their elements to be dragged around 
	// and placed in either list in any order 
	$( "#idList, #opList" ).sortable({
	  connectWith: ".connectedSortable"
	}).disableSelection();
	
	//Configures the popup that appears when 'Upload Disease Options' is clicked
	var uploadDiseasesDialog = $("#uploadDiseasesModal").dialog({
		autoOpen: false,
		height: 400,
		width: 400,
		modal: true,	
		buttons: {
			Cancel: function() {
				uploadDiseasesDialog.dialog( "close" );
			}
		},
		close: function() {
			
		}
	});
	
	//Called when upload diseases is clicked, opens popup
	$("#uploadDiseasesBtn").click(function() {
		uploadDiseasesDialog.dialog("open");
	});
	
	//Called when user changes the input of the disease file upload 
	//For reference on working with file uploads:
	// https://developer.mozilla.org/en-US/docs/Using_files_from_web_applications
	$("#diseasesFile").change(function() {
		var file = $("#diseasesFile").get(0).files[0];
		
		//TODO is there any other way to determine file type?
		// file.type returns '' 
		if(file.name.includes('.json')){
			$("#submitDiseasesBtn").prop('disabled', false);
		}
		else {
			$("#submitDiseasesBtn").prop('disabled', true);
			alert("Must be a .json file");
		}
	});
	
	$("#submitDiseasesBtn").click(function() {
		var file = $("#diseasesFile").get(0).files[0];
		uploadDiseasesDialog.dialog("close");
		
		var reader = new FileReader();
        reader.onload = onDiseaseFileReaderLoad;
        reader.readAsText(file);
	});
	
	//Configures the Login popup that appears on page load 
	var loginDialog = $("#loginModal").dialog({
		autoOpen: false,
		height: 400,
		width: 400,
		modal: true,	
		close: function() {
			
		},
		closeOnEscape: false,
		open: function(event, ui) {
			$(".ui-dialog-titlebar-close", ui.dialog | ui).hide();
		}
	}).dialog("open");
	
	
	//Callback for clicking 'Login'
	$("#loginBtn").click(function() {
		username = $("#username").val();
		if(!username || username.length <= 0){
			alert("Enter a username!");
			return;
		}
		
		var url = BASE_PATH + GET_PROGRESS_ENDPOINT;
		
		var test = false;
		
		if(test){
			loginDialog.dialog("close");
		}
		
		else {
			var dataToSend = { author: username };
			$.ajax({
				url: url,
				type: 'GET',
				data: dataToSend,
				contentType: 'application/json; charset=utf-8',
				dataType: 'json',
				async: false,
				success: function(response) {
					
					//{marked: int, total: int}
					if(response.marked == 0){
						alert("Warning - your user has no results saved. If this is not your first time using the app, make sure you used the same username (refresh page to login again)");
					}
					
					$("#usernameDisplay").text("You are logged in as " + username + " (" + response.marked + "/" + response.total + " images marked)");
					loginDialog.dialog("close");
					
					nextImage();
				},
				error: function(msg){
					alert(msg);
				}
			});
		}
		
	});
	
	
	//Called when a list element is dropped into the 'Identified Diseases' list
	// Adjusts styling of dropped element, sets it to be selected (if it's not 'Healthy')
	// If 'Healthy' is the one dropped, removes all other list elements and clears the scene
	$( "#idList" ).on( "sortreceive", function( event, ui ) {
		$(".selected").removeClass('selected');
		ui.item.addClass('ui-state-highlight');
		ui.item.removeClass('ui-state-default');
		
		if(ui.item.attr('id') === 'Healthy'){
			//Healthy was moved to Identified disease,
			// so remove all other diseases from identified list 
			removeDiseasesFromIdList();
			$("#clear").click();
		}
		else {
			ui.item.bind('click', function(){
				onSelect(ui.item);
			});
			ui.item.trigger('click');
			
			addToSeverities(ui.item);
			
			//Move 'Healthy' to other list if not already there
			if(HealthyIdentified){
				addItemToList(OP_LIST_ID, "Healthy");
				HealthyIdentified = false;
			}
		}
	});
	
	//Called when a list element is dropped into the 'All Options' list
	//Just changes styling, and will put 'Healthy' into identified if it's empty 
	$( "#opList" ).on( "sortreceive", function( event, ui ) {
		ui.item.addClass('ui-state-default');
		ui.item.removeClass('ui-state-highlight');
		ui.item.removeClass('selected');
		selected = "Healthy";
		
		if(ui.item.attr('id') !== 'Healthy'){
			removeFromSeverities(ui.item);
		}
		
		if ($("#idList li").length == 0){
			addItemToList(ID_LIST_ID, "Healthy");
			HealthyIdentified = true;
		}
	});
	
	/*
	 Called when user clicks on Raphael drawing context (image)
	 basically inits the path with the mouse coord, 
	 and sets the mouseDown flag so other callbacks know 
	 if button is clicked or not 
	*/
	$("#canvas").bind("mousedown", function(e){
		if(selected === 'Healthy')
			return;
		
		mouseDown = true;
		
		var parentOffset = $(this).parent().offset(); 
		var X = e.pageX - parentOffset.left;
		var Y = e.pageY - parentOffset.top;
		
		path.push(['M', X, Y]);
		paper.path(path).attr({stroke: selectedColor, 'stroke-width':STROKE_WIDTH});
	});
	
	/*
	 Called when mouse moves within the drawing canvas 
	 if mouse is down, adds current coordinate to current path, 
	 and redraws it (removing last drawn path from scene)
	*/
	$("#canvas").bind("mousemove", function(e){
		var parentOffset = $(this).parent().offset(); 
		var X = e.pageX - parentOffset.left;
		var Y = e.pageY - parentOffset.top;
		
		if(mouseDown) {
			paper.top.remove();
			path.push(['L', X, Y]);
			paper.path(path).attr({stroke: selectedColor, 'stroke-width': STROKE_WIDTH});
		}
	});
	
	/*
	 Called when user releases mouse button in canvas.
	 Completes the current path, saves it to the data structures,
	 and prepares variables for a new path to be drawn
	*/
	//TODO - possibly change to document.mouseUp? in case user let's go slightly outside of canvas 
	$("#canvas").bind("mouseup", function(e){
		path.push(['Z']);
		paper.top.remove();
		
		mouseDown = false;
		
		var obj;
		if(fill){
			obj = paper.path(path).attr({stroke: selectedColor, 'stroke-width':STROKE_WIDTH, fill: selectedColor});
		}
		else {
			obj = paper.path(path).attr({stroke: selectedColor, 'stroke-width':STROKE_WIDTH });
		}
		
		if(!paths[selected]){
			paths[selected] = [];
		}
		paths[selected].push( { pathArr: path, pathObj: obj});
		path = [];
		pathStack.push(selected);
	});
	
	
	//Called when the 'Show only Selected Disease' checkbox changes 
	// Either shows all paths, or hides those that aren't for the 
	// selected disease 
	$("#displayToggle").change(function() {
		var showAll = !($("#displayToggle").is(":checked"));
		for(key in paths){
		  var value = paths[key];
		  if(showAll){
			for(var i=0; i<value.length; i++){
				value[i].pathObj.show();
			}
		  }
		  else if(key !== selected){
			for(var i=0; i<value.length; i++){
				value[i].pathObj.hide();
			}
		  } 
		  else {
			for(var i=0; i<value.length; i++){
				value[i].pathObj.show();
			}
		  }
		}
	});
	
	
	//Called when 'Fill selection' is toggled 
	// Either adds or removes the fill for each path 
	// And subsequent paths will have/not have fill based 
	// on current value 
	$("#fillSelection").change(function() {
		fill = $("#fillSelection").is(":checked");
		
		for(key in paths){
			var value = paths[key];
			for(var i=0; i<value.length; i++){
				if(fill){
					var color = value[i].pathObj.attr('stroke');
					value[i].pathObj.attr('fill', color);
				}
				else {
					//TODO have an array of fills. should be empty if fill is unchecked
					// if checked, add separate object for fill, with same path array 
					// as the unfilled-path 
					// Because unchecking fill after a path was drawn doesn't 
					// remove the fill from the output image 
					value[i].pathObj.attr('fill', '');
				}
			}
		}
	});
	
	
	//Callback for 'Clear' button 
	// Removes all data and resets paper 
	$("#clear").click(function() {
		clearData();
		
		//paper.clear() removes image, so need to reset it:
		initRaphael(curImageUrl);
	});
	
	
	//Callback for the 'Clear Selected Disease' button 
	// Removes paths associated with that disease 
	// and removes that data from the data structures
	$("#clearSelected").click(function() {
		if(selected === 'Healthy')
			return;
		var selectedShapePaths = paths[selected];
		for(var i=0; i<selectedShapePaths.length; i++){
			selectedShapePaths[i].pathObj.remove();
		}
		paths[selected] = [];
		clearFromPathStack();
	});
	
	
	//Callback for 'undo' button 
	//Removes the last drawn path and associated data
	$("#undo").click(function() {
		if(paper.top && pathStack.length > 0) {
			paper.top.remove();
			var lastId = pathStack[pathStack.length - 1];
			var customPathObjArray = paths[lastId];
			customPathObjArray.splice(customPathObjArray.length - 1, 1);
			pathStack.splice(pathStack.length - 1, 1);
		}
	});
	
	
	//Callback for 'save' button 
	// Converts the raphael drawing to a single image (raphael drawings are SVG's)
	// Puts that image in a <canvas> element, so it's URI can be extracted 
	// Then downloads image and JSON file containing output
	$("#save").click(function() {
		//var mycanvas = document.getElementById("outputCanvas");
		//var mycontext = mycanvas.getContext('2d');
		//var svg = paper.toSVG();
		
		//Takes an SVG image and renders it as an image in a canvas 
		//canvg(mycanvas, svg, { ignoreClear: true } );
		
		//TODO - is it possible to hide the output canvas 
		
		//Run after 100 ms in case image isn't converted to other canvas instantly 
		//setTimeout(downloadImage, 100);
		
		//createAndDownloadJSON();
		
		upload();
	});
});

function upload() {
	var url = BASE_PATH + UPLOAD_ENDPOINT;
	
	var paths = getPathsString();
	
	var severities = getSeverities();
	
	var dataToSend = { "image_id": "" + curImageId, "author": username, "paths": paths, 
		"severities": severities	};
	
	//console.log(JSON.stringify(dataToSend));
	//alert(JSON.stringify(dataToSend));
	
	$.ajax({
		url: url,
		type: 'POST',
		data: JSON.stringify(dataToSend),
		contentType: 'application/json; charset=utf-8',
		dataType: 'json',
		async: true,
		success: function(response) {
			nextImage();
			
			updateProgress();
		},
		error: function(msg){
			alert(JSON.stringify(msg));
		}
	});
}


function updateProgress() {
	var url = BASE_PATH + GET_PROGRESS_ENDPOINT;
	var dataToSend = { author: username };
	$.ajax({
		url: url,
		type: 'GET',
		data: dataToSend,
		contentType: 'application/json; charset=utf-8',
		dataType: 'json',
		async: false,
		success: function(response) {
			
			$("#usernameDisplay").text("You are logged in as " + username + " (" + response.marked + "/" + response.total + " images marked)");
			
		},
		error: function(msg){
			alert(JSON.stringify(msg));
		}
	});
}

function getPathsString(){
	var contentObj = {}
	
	$("#idList li").each(function() {
		var key = this.id;
		
		if(key === "Healthy")
			//Returning false just breaks from the each loop, 
		    //doesn't return from 'createAndDownloadJSON'
			return false; 
		
		var value = paths[key];
		if(value.length > 0){
			contentObj[key] = [];
			for(var i=0; i<value.length; i++){
				contentObj[key].push(value[i].pathArr);
			}
		}
	});
	
	return JSON.stringify(contentObj);
}

function getSeverities() {
	var arr = [];
	
	$("#diseaseSeverities div").each(function() {
		var c = $(this).attr('class');
		var id = c.substring(c.indexOf("_") + 1);
		
		//var idStr = "" + id + "";
		var obj = {};
		var value = $(this).find("#severity" + id).val();
		obj[id] = value;
		
		arr.push(obj);
	});
	
	return arr;
}


//Called when 'Clear Selected Disease' is pressed
// Removes instances of the selected disease from the pathStack (the 'undo' stack)
function clearFromPathStack(){
	var restart = false;
	for(var i=0; i<pathStack.length; i++){
		if(pathStack[i] === selected){
			pathStack.splice(i, 1);
			restart = true;
			break;
		}
	}
	if(restart)
		clearFromPathStack();
}

//Resets all selections, markings, and path data
function clearData() {
	paths = {};
	pathStack = [];
	
	//Add Healthy to identified diseases and remove all other selections
	addItemToList("idList", "Healthy");
	removeDiseasesFromIdList();
	selected = "Healthy";
	$(".selected").removeClass('selected');
	HealthyIdentified = true;
	
	//Clear severities:
	$("#diseaseSeverities").empty();
}

//Removes every disease from the 'Identified diseases' list 
function removeDiseasesFromIdList() {
	$("#idList li").each(function(i, li){
		var element = $(li);
		var id = element.attr('id');
		if(id !== 'Healthy'){
			addItemToList(OP_LIST_ID, id);
		}
	});
	HealthyIdentified = true;
}


//Callback for when a disease option is clicked 
// Gives it a red border and sets 
// the selected and selectedColor vars appropriately
function onSelect(li) {
	$(".selected").removeClass('selected');
	li.addClass('selected');
	selected = li.attr("id");
	var selectedColorBox = $("#" + selected + " .color-box");
	selectedColor = selectedColorBox.first().css("background-color");
	
	$("#displayToggle").change();
}


//Removes the element with the given id from it's current spot
// Places a clone of that removed element (with same id)
// into the list with the specified listID
function addItemToList(listId, id) {
	var clone = $("#" + id).clone();
	
	var classToAdd = 'ui-state-default';
	var classToRemove = 'ui-state-highlight';
	if(listId === 'idList') {
		var temp = classToAdd;
		var classToAdd = classToRemove;
		classToRemove = temp;
	}
	
	clone.addClass(classToAdd);
	clone.removeClass(classToRemove);
	
	$("#" + id).remove();
	clone.appendTo("#" + listId);
}


//Sets up the Raphael paper (drawing context)
//	initializes it if it doesn't exist,
//  clears it otherwise 
//Then sets the given image to be the background
//Finally prevents dragging on the image, which 
// would otherwise cause issues in FireFox
function initRaphael(filename) {
	if(typeof paper == 'undefined'){
		paper = Raphael("canvas", CANVAS_SIZE,CANVAS_SIZE);
	}
	else {
		paper.clear();
	}
	
	// var imagePath = IMAGES_URL + filename;
	// alert(imagePath);
	var url = BASE_PATH + "getImage.php?id=" + curImageId;
	paper.image(url, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
	
	$('img').on('dragstart', function(event) { event.preventDefault(); });
	$(document).on("dragstart", function(e) {
		var nodeName = e.target.nodeName.toUpperCase();
		if (nodeName == "IMG" || nodeName == "SVG" || nodeName == "IMAGE") {
			if(e.preventDefault){
				e.preventDefault();
			}
			return false;
		}
	});
}

//Called once the uploaded diseases file has been uploaded and read
function onDiseaseFileReaderLoad(event){
	try {
		//Should be an array of JSON objects of the form: { id, name, color(optional) }
		var obj = JSON.parse(event.target.result);
		//alert(JSON.stringify(obj));
	}
	catch(e) {
		alert("You have an error in your JSON. Error message: " + e.message);
	}
		
	try{
		//Remove default options:
		$("#opList").empty();
		
		for(var i=0; i<obj.length; i++){
			addOptionToOptions(obj[i], i);
		}
		
	}
	catch(e){
		alert("Your json file doesn't match the expected format: " + e.message);
	}	
}

//Adds an option from a user's options JSON file to the 'All options' list 
// index is used just for default colors
function addOptionToOptions(optionObj, index){
	//Overall li element that wraps color-box and disease name
	var li = $("<li>", {
		id: optionObj.id,
		class: "ui-state-default",
		
	});
	
	//Goes around the color box to make it sized and centered correctly:
	var colorWrapper = $("<span>", {
		class: "input-color"
	});
	
	//If user supplied a color, use it, otherwise use a default
	var colorStr = "background-color: ";
	if(optionObj.color){
		colorStr += optionObj.color;
	}
	else {
		colorStr += DEFAULT_COLORS[index];
	}
	var colorBox = $("<span>", {
		class: "color-box",
		style: colorStr
	}).appendTo(colorWrapper);
	
	//For displaying disease name: 
	var diseaseName = $("<span>", {
		class: 'diseaseName'
	});
	
	diseaseName.text(optionObj.name);
	
	colorWrapper.appendTo(li);
	diseaseName.appendTo(li);
	
	li.appendTo("#opList");
}


// /*
   // Makes a request to a PHP script on the server that returns 
   // the image names in the iamges folder
   // (javascript can't read directory listings)
 // */
// function getImageNames() {
	// var url = BASE_PATH + PATH_OF_GET_IMAGES_SCRIPT;
	// $.ajax({
	  // dataType: "json",
	  // url: url,
	  // success: function(results){
		  
		  // for(var i=0; i<results.length; i++){
			  // imageFileNames.push(results[i]);
		  // }
		  
		  // nextImage();
	  // }
	// });
// }


/*
	Increments the current image index,
	and retrieves the next one for marking, if there are more.
	Clears existing data from previous image, too 
*/
function nextImage() {
	clearData();
	
	var url = BASE_PATH + GET_NEXT_IMAGE_ENDPOINT;
	var dataToSend = { author: username };
	$.ajax({
		url: url,
		type: 'GET',
		data: dataToSend,
		contentType: 'application/json; charset=utf-8',
		dataType: 'json',
		async: true,
		success: function(response) {
			//alert(JSON.stringify(response));
			curImageId = response.next_image;
			
			if(curImageId === -1){
				alert("You have marked all images!");
				return;
			}
			
			curImageUrl = response.image_url;
			
			curName = response.image_name;
			
			$("#filename").text(curName.substring(curName.indexOf("/")));
			
			initRaphael(curImageUrl);
	
			$("#nextBtnRow").remove();
		},
		error: function(msg){
			alert(JSON.stringify(msg));
		}
	});
}




/*
 Downloads the marked image. 
 First fetches the dataURL from the canvas and sets it as src on a link tag, 
 Then forces a click on the link to start the download
 In case the browser doesn't download the image, a download link is displayed on screen 
 so users can click to manually get the image 
*/
// function downloadImage() {
	
	// var dataURL = document.getElementById('outputCanvas').toDataURL("image/png");
	// forceDownload(dataURL, ".png");
	
	
	// var downloadImageLink = $("<a>", {
		// href: dataURL,
		// id: "imgLink",
		// download: "output-" + curImageUrl + ".png"
	// });
	
	// var newRow = $("<tr>", {
		// id: "nextBtnRow"
	// });
	
	// var nextBtnTd = $("<td>");
	// var nextBtn = $("<input>", {
		// type: "button",
		// id: "nextBtn",
		// value: "Next Image"		
	// });
	// nextBtn.click(nextImage);
	// nextBtn.appendTo(nextBtnTd);
	// nextBtnTd.appendTo(newRow);
	
	// var linkTd = $("<td>", {
		// colspan: 2
	// });
	// downloadImageLink.append($("<span>If you're image did not download, click here</span>"));
	// downloadImageLink.appendTo(linkTd);
	// linkTd.appendTo(newRow);
	
	// $("#settingsTable").append(newRow);
// }


/*
 Goes over data in the paths object 
 Grabs all data associated with each disease, formats it, 
  and puts it into another JSON object without
  the pathObj info (just path points data)
 Encodes content into a format for downloading,
 then forces the download of the JSON file 
*/
function createAndDownloadJSON(){
	var contentObj = {}
	
	$("#idList li").each(function() {
		var key = this.id;
		
		if(key === "Healthy")
			//Returning false just breaks from the each loop, 
		    //doesn't return from 'createAndDownloadJSON'
			return false; 
		
		var value = paths[key];
		if(value.length > 0){
			contentObj[key] = [];
			for(var i=0; i<value.length; i++){
				contentObj[key].push(value[i].pathArr);
			}
		}
	});
	
	var content = JSON.stringify(contentObj);
	
	var dataUrl = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);
	var extension = ".json";
	forceDownload(dataUrl, extension);
}

function addToSeverities(liItem) {
	var id = liItem.attr('id');
	var name = liItem.find('.diseaseName').text();
	
	//alert("id: " + id + ", " + name );
	
	var wrapper = $("<div>", {
		class: "severityWrapper_" + id
	});
	var label = $("<label>").text(name + ": ");
	var input =$("<input>", {
		type: "text",
		value: 0,
		id: "severity" + id
	}).appendTo(label);
	
	label.appendTo(wrapper);
	
	$("#diseaseSeverities").append("<br>");
	wrapper.appendTo('#diseaseSeverities');
}

function getDiseases() {
	
	var url = BASE_PATH + GET_DISEASES_ENDPOINT;
	$.ajax({
		url: url,
		type: 'GET',
		contentType: 'application/json; charset=utf-8',
		dataType: 'json',
		async: true,
		success: function(response) {
			//Remove default options:
			$("#opList").empty();

			for(var i=0; i<response.length; i++){
				addOptionToOptions(response[i], i);
			}
		},
		error: function(msg){
			alert(msg);
		}
	});
	
	
}

function removeFromSeverities(liItem) {
	var id = liItem.attr('id');
	
	var wrapperId = "#severityWrapper" + id;
	
	$(wrapperId).remove();
}

/*
	When the user presses 'Save', a text file and image file 
	should be downloaded. This function forces the given dataUrl to
	be downloaded, so that the user doesn't have to click 2 download buttons
*/
function forceDownload(dataUrl, extension) {
	var a = document.createElement('a');
	a.setAttribute('href', dataUrl);
	a.setAttribute('download', "output-" + curImageUrl + extension);

	if (document.createEvent) {
		var event = document.createEvent('MouseEvents');
		event.initEvent('click', true, true);
		a.dispatchEvent(event);
	}
	else {
		a.click();
	}
}