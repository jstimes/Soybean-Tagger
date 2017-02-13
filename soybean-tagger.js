var paper;

var paths = {};
var path = [];
var pathStack = [];

var fill = false;

var mouseDown = false;

var selected = "none";
var selectedColor = "";

var noneIdentified = true;

		
$( function() {
	initRaphael("leaf.jpg");

	$( "#idList, #opList" ).sortable({
	  connectWith: ".connectedSortable"
	}).disableSelection();
	
	$( "#idList" ).on( "sortreceive", function( event, ui ) {
		$(".selected").removeClass('selected');
		ui.item.addClass('ui-state-highlight');
		ui.item.removeClass('ui-state-default');
		
		if(ui.item.attr('id') === 'none'){
			$("#idList li").each(function(i, li){
				var element = $(li);
				var id = element.attr('id');
				if(id !== 'none'){
					addToOpList(id);
				}
			});
			noneIdentified = true;
			$("#clear").click();
		}
		else {
			ui.item.bind('click', function(){
				onSelect(ui.item);
			});
			ui.item.trigger('click');
			if(noneIdentified){
				addToOpList("none");
				noneIdentified = false;
			}
		}
	});
	
	$( "#opList" ).on( "sortreceive", function( event, ui ) {
		ui.item.addClass('ui-state-default');
		ui.item.removeClass('ui-state-highlight');
		ui.item.removeClass('selected');
		selected = "none";
		
		if ($("#idList li").length == 0){
			addToIdList("none");
			noneIdentified = true;
		}
	});
	
	$('img').on('dragstart', function(event) { event.preventDefault(); });
	
	$("#canvas").bind("mousedown", function(e){
		fixWhich(e);
		var parentOffset = $(this).parent().offset(); 
		//or $(this).offset(); if you really just want the current element's offset
		var X = e.pageX - parentOffset.left;
		var Y = e.pageY - parentOffset.top;
		
		path.push(['M', X, Y]);
		paper.path(path).attr({stroke: selectedColor, 'stroke-width':6});
	});
	
	$("#canvas").bind("mousemove", function(e){
		fixWhich(e);
		var parentOffset = $(this).parent().offset(); 
		//or $(this).offset(); if you really just want the current element's offset
		var X = e.pageX - parentOffset.left;
		var Y = e.pageY - parentOffset.top;
	
		if(e.which == 1) {
			paper.top.remove();
			path.push(['L', X, Y]);
			paper.path(path).attr({stroke: selectedColor, 'stroke-width': 6});
		}
	});
	
	$("#canvas").bind("mouseup", function(e){
		path.push(['Z']);
		paper.top.remove();
		
		var obj;
		if(fill){
			obj = paper.path(path).attr({stroke: selectedColor, 'stroke-width':6, fill: selectedColor});
		}
		else {
			obj = paper.path(path).attr({stroke: selectedColor, 'stroke-width':6 });
		}
		
		if(!paths[selected]){
			paths[selected] = [];
		}
		paths[selected].push( { pathArr: path, pathObj: obj});
		path = [];
		pathStack.push(selected);
	});
	
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
					value[i].pathObj.attr('fill', '');
				}
			}
		}
	});
	
	$("#clear").click(function() {
		paper.clear();
		paths = {};
		pathStack = [];
	});
	
	$("#clearSelected").click(function() {
		var selectedShapePaths = paths[selected];
		for(var i=0; i<selectedShapePaths.length; i++){
			selectedShapePaths[i].pathObj.remove();
		}
		paths[selected] = [];
		clearFromPathStack();
	});
	
	$("#undo").click(function() {
		if(paper.top) {
			paper.top.remove();
			var lastId = pathStack[pathStack.length - 1];
			var customPathObjArray = paths[lastId];
			customPathObjArray.splice(customPathObjArray.length - 1, 1);
			pathStack.splice(pathStack.length - 1, 1);
		}
	});
	
	$("#save").click(function() {
		var mycanvas = document.getElementById("outputCanvas");
		var mycontext = mycanvas.getContext('2d');
		var svg = paper.toSVG();
		canvg(mycanvas, svg, { ignoreClear: true } );
		
		setTimeout(function() {
			//fetch the dataURL from the canvas and set it as src on a link, 
			// then force click it to download
			
			/*var dataURL = document.getElementById('outputCanvas').toDataURL("image/png");
			var a = $("<a>")
				.attr("href", dataURL)
				.attr("download", "img.png");

			a[0].click();*/
			
		}, 100);
		
		createAndDownloadJSON();
	});
	
});

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

function onSelect(li) {
	$(".selected").removeClass('selected');
	li.addClass('selected');
	selected = li.attr("id");
	var selectedColorBox = $("#" + selected + " .color-box");
	selectedColor = selectedColorBox.first().css("background-color");
	
	$("#displayToggle").change();
}

function addToOpList(id){
	var clone = $("#" + id).clone();
	clone.addClass('ui-state-default');
	clone.removeClass('ui-state-highlight');
	$("#" + id).remove();
	clone.appendTo("#opList");
}

function addToIdList(id){
	var clone = $("#" + id).clone();
	clone.addClass('ui-state-highlight');
	clone.removeClass('ui-state-default');
	$("#" + id).remove();
	clone.appendTo("#idList");
}

function fixWhich(e){
	if(!e.which && e.button) {
		if (e.button & 1) e.which = 1      // Left
		else if(e.button & 4) e.which = 2 // middle
		else if(e.button & 2) e.which = 3 // right
	}
}

function initRaphael(filename) {
	if(!paper){
		paper = Raphael("canvas", 500,500);
	}
	else {
		paper.clear();
	}
	paper.image(filename, 0, 0, 500, 500);
}

//TODO sort by order in ID list
function createAndDownloadJSON(){
	var contentObj = {}
	for(key in paths){
		var value = paths[key];
		if(value.length > 0){
			contentObj[key] = [];
			for(var i=0; i<value.length; i++){
				contentObj[key].push(value[i].pathArr);
			}
		}
	}
	
	var content = JSON.stringify(contentObj);
	
	var pom = document.createElement('a');
	pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
	pom.setAttribute('download', "imgData.json");

	if (document.createEvent) {
		var event = document.createEvent('MouseEvents');
		event.initEvent('click', true, true);
		pom.dispatchEvent(event);
	}
	else {
		pom.click();
	}
}