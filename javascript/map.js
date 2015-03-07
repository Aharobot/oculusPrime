var mapzoom = 1; //future: set from cookie
var mapimgdivwidth = 480; //future: set from cookie
var mapimgdivheight = 480; //future: set from cookie
var mapimgleft = 0; //future: set from cookie
var mapimgtop = 0; //future: set from cookie
var mapzoomtimer;
var rosmapinfotimer = null;
var rosmapimgleftstart = null;
var rosmapimgtopstart = null;
var rosmapimggrabstartxy = null;
//var rosimgloading = true;
var rosmapimgnext = new Image();
var rosmapupdate = null;
var robotx = 0;
var roboty = 0; 
var robotth = 0;
var robotsize = 0.3;
var amcloffstx = 0;
var amcloffsty = 0;
var amcloffstth = 0;
var rosodomx = 0;
var rosodomy = 0;
var rosodomth = 0;
var mapinfo=[0,0,0,0,0,0];
var odom=[0,0,0];
var globalpath = null;
var maparrowpose = null;
var rosmaparrowmode = null;
var mapgoalpose = null;
var laserscan = null;
var goalposesettime = 0; 
var waypoints = [];
var pendingwaypoint = null;
var mapshowwaypoints = true;
var routesxml = null;

function rosmap(mode) {
	
	var v = document.getElementById("main_menu_over");
	var xy = findpos(v);
	var x = xy[0] + v.offsetWidth;
	var y=findpos(document.getElementById("video"))[1];
	var date = new Date().getTime();
	var str = document.getElementById("rosmap_menu_hiddencontents").innerHTML;
	var img = new Image();
	img.src = 'frameGrabHTTP?mode=rosmap&date='+ date;
	
	callServer("loadwaypoints","");
	
	img.onload= function() {
		// defaults
		var width = mapimgdivwidth;
		if (width == null ) width = 480;
		var height = mapimgdivheight;
		if (height == null) height = 480;

		var zoom = mapzoom;
		if (zoom == null) {
			if (img.naturalWidth/width > img.naturalHeight/height) {
				zoom = width/img.naturalWidth;
				mapzoom = zoom;
			}
			else zoom = height/img.naturalHeight;
		}
		
		var left = mapimgleft;
		if (left == null) left = -((img.naturalWidth * zoom)-width)/2; // center default
		var top = mapimgtop;
		if (top == null) top = -((img.naturalHeight * zoom)-height)/2; // center default	
		
		str += "<div id='rosmapimgdiv' style='width: "+width+"px; height: "+height+"px; "; // img div
		str += "overflow: hidden;'>";

		str += "<div style='height: 0px; width: 0px; position: relative; z-index: 3'>";
		str += "<canvas id='rosmapwaypoints' style='position: relative'></canvas></div>";
		
		str += "<div style='height: 0px; width: 0px; position: relative; z-index: 4'>";
		str += "<canvas id='rosmaparrow' style='position: relative'></canvas></div>";
		
		str += "<div style='height: 0px; width: 0px; position: relative; z-index: 5'>";
		str += "<canvas id='rosmaprobot' style='cursor: move; position: relative'></canvas></div>";
		
		str += "<img id='rosmapimg' src='frameGrabHTTP?mode=rosmap&date=" + date + "' " ;
		str += "width='" + img.naturalWidth * zoom +"' ";
		str += "height='" + img.naturalHeight * zoom +"' ";
		str += "style='position: relative; left: "+left+"px; top: "+top+"px; '";
		str +=	"alt=''></div>";
		popupmenu('rosmap', 'show', x, y, str, width, 1, null );
		
		// drag
		var rmi = document.getElementById("rosmaprobot"); // was rosmapimg
//		rmi.ondragstart = function() { return false; };
		rmi.onmousedown = function(event) {
			rosmapimggrabstartxy = getmousepos(event);
			rosmapimgleftstart = mapimgleft;
			rosmapimgtopstart = mapimgtop;
			var i = document.getElementById("rosmaprobot");
			i.onmousemove = function(event) { rosmapimgdrag(event); }
			i.onmouseout = function() { 
				document.getElementById("rosmaprobot").onmousemove = null; }
		}
		rmi.onmouseup = function() { 
			document.getElementById("rosmaprobot").onmousemove = null; }

		rosmapupdate = null;
		openxmlhttp("frameGrabHTTP?mode=rosmapinfo", rosinfo);
	}
	
}

function rosmapImgReload() {
	if (document.getElementById("rosmap_menu_over").style.display != "") return;
	
	rosimgreloadtimer = null; // ?
	date = new Date().getTime();
	rosmapimgnext.src = "frameGrabHTTP?mode=rosmap&date="+date;
	rosmapimgnext.onload = function() {
		var img = document.getElementById('rosmapimg');
		img.src = rosmapimgnext.src;
	}
}

function rosinfo() {
	if (document.getElementById("rosmap_menu_over").style.display != "") return;
	
	if (xmlhttp.readyState==4) {// 4 = "loaded"
		if (xmlhttp.status==200) {// 200 = OK
			var str = xmlhttp.responseText;
			//  width_height_res_originx_originy_originth_updatetime odomx_odomy_odomth
			
			var s = str.split(" ");
			
			var nukegoalpose = true;
//			if (s.length == 0) nukegoalpose = false; // in case of empty xmlhttp
			// to prevent cancellening right after setting:
			var t = new Date().getTime();
			if (t - goalposesettime < 5000) nukegoalpose = false;
			
			var rosmaprezoom = false;
			
			for (var i=0; i<s.length; i++) {
				var ss = s[i].split("_");
				
				switch(ss[0]) {
					
					case "rosmapinfo":
						mapinfo = ss[1].split(",");
						break;
						
					case "rosmapupdated": 
						rosmaprezoom = true;
						break;
					
					case "rosamcl":
						var amcl = ss[1].split(",");
						amcloffstx = parseFloat(amcl[0]);
						amcloffsty = parseFloat(amcl[1]);
						amcloffstth = parseFloat(amcl[2]);
						rosodomx = parseFloat(amcl[3]);
						rosodomy = parseFloat(amcl[4]);
						rosodomth = parseFloat(amcl[5]);
						break;
						
					case "rosglobalpath":
						globalpath = ss[1].split(",");
						break;
						
					case "rosscan":
						laserscan = ss[1].split(",");
						break;
						
					case "roscurrentgoal":
						nukegoalpose = false;
						if (mapgoalpose != null) break;
						var arr = ss[1].split(",");
						var conv = fromrosmeters([arr[0], arr[1], arr[2]]);
						mapgoalpose = [conv[0], conv[1], conv[2]];
						str = "<a class='blackbg' href='javascript: callServer(&quot;state&quot;, &quot;rosgoalcancel true&quot;)'>";
						str += "<span class='cancelbox'><b>X</b></span> ";
						str += "CANCEL GOAL</a>"; 
						document.getElementById("rosmapinfobar").innerHTML = str; 
						break;
					
					case "rosmapwaypoints":
						waypoints = [];
						var arr = ss[1].split(",");
						for (var n = 0 ; n <= arr.length - 4 ; n += 4) {
							waypoints[n] = arr[n];
							var conv = fromrosmeters([arr[n+1], arr[n+2], arr[n+3]]);
							waypoints[n+1] = conv[0];
							waypoints[n+2] = conv[1];
							waypoints[n+3] = conv[2];
						}
						break;
				
				}
			}
			
			if (mapgoalpose != null && nukegoalpose)  {
				mapgoalpose = null;
				rosmaparrow("cancel");
			}
			
			if (rosmaprezoom) { rosmapzoomdraw(mapzoom, 0); }
			else drawmapinfo();
//			drawmapinfo();
			
			var updatetime = parseFloat(mapinfo[6]);
			if (rosmapupdate != null) { 
				if (updatetime > rosmapupdate) rosmapImgReload();
			}
			rosmapupdate = updatetime;
			
			setTimeout("openxmlhttp('frameGrabHTTP?mode=rosmapinfo', rosinfo);", 510);
		}
	}
}

function rosmapimgdrag(ev) {

	var xy = getmousepos(ev);
	var xdelta = xy[0] - rosmapimggrabstartxy[0];
	var ydelta = xy[1] - rosmapimggrabstartxy[1];
	mapimgleft = rosmapimgleftstart +xdelta;
	mapimgtop = rosmapimgtopstart + ydelta;
	var img = document.getElementById("rosmapimg");
	img.style.left = mapimgleft + "px";
	img.style.top = mapimgtop + "px";

	drawmapinfo();
}


function rosmapzoom(mult) {
	var increment = 0.1;
	var steptime = 100;
	if (mult != 0) { 
		var zoom = mapzoom * (1 + increment * mult);
		if (mapzoomtimer == null) steptime = 0;
		mapzoomtimer = setTimeout("rosmapzoomdraw("+zoom+", "+mult+");", steptime);
	}
	else { // cancel
		clearTimeout(mapzoomtimer);
		mapzoomtimer = null;
	}
}

function rosmapzoomdraw(zoom, mult) {
	if (zoom < 0.1 || zoom > 10) return;
	
	var img = document.getElementById("rosmapimg");
	//determine previous center position ratio
	var ctrwidthratio = ((mapimgdivwidth/2)-mapimgleft)/img.width;
	var ctrheightratio = ((mapimgdivheight/2)-mapimgtop)/img.height;
	// set new zoom level:
	img.width = img.naturalWidth * zoom;
	img.height = img.naturalHeight * zoom;
	//set new position:
	
	mapimgleft = (mapimgdivwidth/2)-(img.width * ctrwidthratio);
	mapimgtop = (mapimgdivheight/2)-(img.height * ctrheightratio);
	
	img.style.left = mapimgleft+"px";
	img.style.top = mapimgtop+"px";
	
	mapzoom = zoom;

	drawmapinfo();
	
	rosmapzoom(mult);
}

function drawmapinfo(str) {
	if (document.getElementById("rosmap_menu_over").style.display == "none") return;
	
	//  width_height_res_originx_originy_originth_updatetime odomx_odomy_odomth
	
	var robotcanvas = document.getElementById("rosmaprobot");
//	var img = document.getElementById("rosmapimg");

	robotcanvas.width = mapimgdivwidth;
	robotcanvas.height = mapimgdivheight;
	
	var res = parseFloat(mapinfo[2]);  // resolution

	// robot center
	var x = parseFloat(mapinfo[3]) - (rosodomx + amcloffstx);  // x = originx - odomx
	x /= -res;   //   x /= res
	robotx = x; // before scaling and offsets
	x= x * mapzoom + mapimgleft;

	var y = parseFloat(mapinfo[4]) - (rosodomy + amcloffsty);  // y = originy - odomy
	y /= -res;  // y /= res
	y = parseFloat(mapinfo[1])-y;
	roboty = y; // before scaling and offsets
	y = y * mapzoom + mapimgtop;

	// robot angle
	var th = -(parseFloat(mapinfo[5]) + (rosodomth + amcloffstth)); // originth + odomth
	robotth = th;
	// robot size
	var size = robotsize/parseFloat(mapinfo[2]) * mapzoom; 
	
	var context = robotcanvas.getContext('2d');
	context.translate(x, y);

	if (globalpath) {

		context.rotate(-amcloffstth);

		context.beginPath()
		for (var i=0; i < globalpath.length; i+= 2) {
			
			var pathx = parseFloat(mapinfo[3]) - (parseFloat(globalpath[i]) + amcloffstx);  // x = originx - x
			pathx /= -res;   //   x /= res
			pathx= pathx * mapzoom + mapimgleft;
			pathx -= x;

			var pathy = parseFloat(mapinfo[4]) - (parseFloat(globalpath[i+1]) + amcloffsty);  // y = originy - odomy
			pathy /= -res;  // y /= res
			pathy = parseFloat(mapinfo[1])-pathy;
			pathy = pathy * mapzoom + mapimgtop;
			pathy -= y;
			
			if (i <2)   context.moveTo(pathx, pathy);
			else  context.lineTo(pathx, pathy);
		}
		context.lineWidth = 1;
		context.strokeStyle = "#0000ff";
		context.stroke();
		context.rotate(+amcloffstth);
	} 
		
	context.rotate(th);
	
	if (laserscan) {
		var anglemax = 0.51; // radians
		var anglestep = (anglemax*2)/(laserscan.length-1);
		var angle = anglemax;
		context.fillStyle = "#ff00ff";
		for (i = 0; i < laserscan.length; i++) {
			if (laserscan[i] != "nan") {
				var px = Math.cos(angle)*parseFloat(laserscan[i]) / res * mapzoom;
				var py = Math.sin(angle)*parseFloat(laserscan[i]) / res * mapzoom;
				context.fillRect(px-1, py-1, 3, 3);
			}
			angle -= anglestep;
		}
	}

	// draw robot
	var linewidth = 3;
	var stroke = "#ff0000";
	var fill = "#ffffff";
	
	context.beginPath();
	context.moveTo(size/2, 0);
	context.lineTo(size/2+20, 0);
	context.lineWidth = linewidth;
	context.strokeStyle = stroke;
	context.stroke();
	
	context.beginPath();
	context.moveTo(size/2+14,6);
	context.lineTo(size/2+20,0);
	context.lineTo(size/2+14,-6);
	context.lineWidth = linewidth;
	context.strokeStyle = stroke;
	context.stroke();
	
	context.beginPath();
	context.moveTo(size / -2, size / -2);
	context.lineTo(size / 4, size / -2);
	context.lineTo(size / 2, size / -6);
	context.lineTo(size /2, size / 6);
	context.lineTo(size / 4, size /2);
	context.lineTo(size / -2, size /2);
	context.lineTo(size / -2, size / -2);
	context.fillStyle = fill;
	context.fill();
	context.lineWidth = linewidth;
	context.strokeStyle = stroke;
	context.stroke();
	

	drawmaparrow();
	drawmapwaypoints();
	
}

function rosmaparrow(mode) {
	if (document.getElementById("rosmap_menu_over").style.display == "none") return;
	if (mode != "cancel") {
		var a =document.getElementById("videooverlay");
		a.onmouseover = null;
	    a.onmouseout = null;
	    a.onclick = null;
		
	    var str = "";
	    
	    if (mode=="position") str += "drop arrow to set current location &nbsp; ";
	    else if (mode=="goalpose") str += "drop arrow to drive to location  &nbsp; ";
	    
		str += "<a class='blackbg' href='javascript: rosmaparrow(&quot;cancel&quot;)'>";
		str += "<span class='cancelbox'><b>X</b></span> ";
		str += "CANCEL</a>"; 
		document.getElementById("rosmapinfobar").innerHTML = str; 
		
		var robotcanvas = document.getElementById("rosmaprobot");
		robotcanvas.style.cursor = "crosshair";
		
		var arrowcanvas = document.getElementById("rosmaparrow");
//		var img = document.getElementById("rosmapimg");

		arrowcanvas.width = mapimgdivwidth;
		arrowcanvas.height = mapimgdivheight;
		
		maparrowpose = null;
		
		robotcanvas.onmouseover = function() { // hover with point only, no arrow yet
			maparrowpose = [];
			rosmaparrowmode = mode;
			robotcanvas.onmouseover = null;
		}
		
		document.onmousemove = function(event) { // hover with xy point only, no arrow yet
			if (maparrowpose == null) return;
			var xy = getmousepos(event);
			var arxy = findpos(document.getElementById("rosmapimg"));
			maparrowpose[0] = (xy[0]-arxy[0])/mapzoom;
			maparrowpose[1] = (xy[1]-arxy[1])/mapzoom;
			drawmaparrow();
		}

		robotcanvas.onclick = function(event) { // set location xy
						
			document.onmousemove = function(event) { // hover setting arrow direction
				
				var xy = getmousepos(event);
				var arxy = findpos(document.getElementById("rosmapimg"));
				
				var deltax = (xy[0]-arxy[0])/mapzoom - maparrowpose[0];
				var deltay = (xy[1]-arxy[1])/mapzoom - maparrowpose[1];
				maparrowpose[2] = Math.atan(deltay/deltax); // theta
				if (deltax < 0) maparrowpose[2] += Math.PI; 
				drawmaparrow();
			}
			
			robotcanvas.onclick = function(event) { // arrow complete

				clicksteer("on");
				
				if (rosmaparrowmode == "goalpose") { 
					rosmapsetgoal(maparrowpose);
				}
				else if (rosmaparrowmode == "position") {
					// send initial position maparrowpose[] to ROS:
					var pose = torosmeters(maparrowpose);
					callServer("state","rosinitialpose "+pose[0]+"_"+pose[1]+"_"+pose[2]);
					if (mapgoalpose != null) maparrowpose = mapgoalpose;
					else {
						var arrowcanvas = document.getElementById("rosmaparrow");
						arrowcanvas.width = 0;
						arrowcanvas.height = 0;						
					}
					document.getElementById("rosmapinfobar").innerHTML = "";
				}
				else if (rosmaparrowmode == "waypoint") {
					// send goal pose
					setwaypoint(maparrowpose);
					
					if (mapgoalpose != null) maparrowpose = mapgoalpose;
					else {
						var arrowcanvas = document.getElementById("rosmaparrow");
						arrowcanvas.width = 0;
						arrowcanvas.height = 0;						
					}
				}
				maparrowpose = null;
				document.onmousemove = null;
				robotcanvas.onclick = null;
				robotcanvas.onmouseover = null;
				robotcanvas.style.cursor = "move";
				rosmaparrowmode = null;
			}
		}
		
		drawmaparrow();
	}
	else { // cancel
		document.getElementById("rosmapinfobar").innerHTML = "";
		document.onmousemove = null;
		var rmr = document.getElementById("rosmaprobot")
		rmr.onclick= null;
		rmr.style.cursor = "move";
		rmr.onmouseover = null;
		rosmaparrowmode = null;
		if (mapgoalpose != null) maparrowpose = mapgoalpose;
		else {
			var arrowcanvas = document.getElementById("rosmaparrow");
			arrowcanvas.width = 0;
			arrowcanvas.height = 0;
			maparrowpose = null;
		}

		pendingwaypoint = null;
		clicksteer("on");
	}
}

function drawmaparrow() {
	
	if (maparrowpose == null && mapgoalpose == null)  return;
	var pose = maparrowpose;
	if (maparrowpose == null) pose = mapgoalpose;

	var arrowcanvas = document.getElementById("rosmaparrow");
	
	arrowcanvas.width = mapimgdivwidth;
	arrowcanvas.height = mapimgdivheight;
	
	var context = arrowcanvas.getContext('2d');
	context.translate(pose[0]*mapzoom + mapimgleft, pose[1]*mapzoom + mapimgtop);
	
	var linewidth = 3;
	
	switch (rosmaparrowmode) {
	case "position":
		var stroke = "#ffffff";
		var fill = "#000000";
		break;
	
	case "waypoint":
		mapshowwaypoints = true;
		var stroke = "#ffffff";
		var fill = "#0000ff";
		break;
		
	default: // "goalpose":
		var stroke = "#ffffff";
		var fill = "#ff0000";
		break;
	}

	var r = 10;
	if (pose[2] != null) r = 5;
	
	// circle
	context.beginPath();
	context.arc(0, 0, r, 0, 2 * Math.PI, false);
	context.fillStyle = fill;
	context.fill();
	context.lineWidth = linewidth;
	context.strokeStyle = stroke;
	context.stroke();
	
	if (pose[2] == null) return;
	
	context.rotate(pose[2]);
	
	// arrow
	context.beginPath();
	context.moveTo(r, 0);
	context.lineTo(r + 30, 0);
	context.lineWidth = linewidth;
	context.strokeStyle = stroke;
	context.stroke();
	context.beginPath();
	context.moveTo(r + 24,6);
	context.lineTo(r + 30,0);
	context.lineTo(r + 24,-6);
	context.lineWidth = linewidth;
	context.strokeStyle = stroke;
	context.stroke();
	
}

function rosmapsetgoal(pose) {
	mapgoalpose = pose;
	goalposesettime = new Date().getTime();
	// send goalpose maparrowpose[] to ROS:
	var pose = torosmeters(mapgoalpose);
//	callServer("state","rossetgoal "+pose[0]+","+pose[1]+","+pose[2]);
	callServer("gotowaypoint", pose[0]+","+pose[1]+","+pose[2]);

	str = "<a class='blackbg' href='javascript: callServer(&quot;state&quot;, &quot;rosgoalcancel true&quot;)'>";
	str += "<span class='cancelbox'><b>X</b></span> ";
	str += "CANCEL GOAL</a>"; 
	document.getElementById("rosmapinfobar").innerHTML = str; 
}

function torosmeters(arr) {
	var x= parseFloat(arr[0]);
	var y= parseFloat(arr[1]);
	var th = parseFloat(arr[2]);
	var res = parseFloat(mapinfo[2]);
	var originx = parseFloat(mapinfo[3]);
	var originy = parseFloat(mapinfo[4]);
	var originth = parseFloat(mapinfo[5]);
	var height = document.getElementById("rosmapimg").naturalHeight;
	
	x *= res;
	x += originx;
	x = Math.round(x*1000)/1000;
	
	y -= height;
	y *= -res;
	y += originy;
	y = Math.round(y*1000)/1000;
	
	th += originth;
	th *= -1;
	if (th < -Math.PI) th = Math.PI*2 + th;
//	th = Math.PI*2 -th;
	// should be: upper left = 1.5-3.14  upper right = 0-1.5  lower right = 0-(-1.5) lower left = (-1.5)-(-3.14)  
	th = Math.round(th*10000)/10000;
	
//	return x+"_"+y+"_"+th;
	return [x,y,th];
}

function fromrosmeters(arr) {
	var x= parseFloat(arr[0]);
	var y= parseFloat(arr[1]);
	var th = parseFloat(arr[2]);
	var res = parseFloat(mapinfo[2]);
	var originx = parseFloat(mapinfo[3]);
	var originy = parseFloat(mapinfo[4]);
	var originth = parseFloat(mapinfo[5]);
	var height = document.getElementById("rosmapimg").naturalHeight;
	
	x = originx -x;
	x /= -res;
	
	y -= originy;
	y /= -res;
	y += height;
	 
	th *= -1;
	th -= originth;
	if (th < -Math.PI) th = Math.PI*2 + th;
	
	return [x,y,th];
}

function saverosmapwindowpos() {
	var mapwindowvalue = mapzoom+","+mapimgdivwidth+","+mapimgdivheight+","+mapimgleft+","+mapimgtop;
	createCookie("rosmapwindow", mapwindowvalue, 364 );
}

function loadrosmapwindowpos() {
	var m = readCookie("rosmapwindow");
	if (m == null) return;
	values = m.split(",");
	mapzoom = parseFloat(values[0]);
	mapimgdivwidth = parseInt(values[1]);
	mapimgdivheight = parseInt(values[2]);
	mapimgleft = parseInt(values[3]);
	mapimgtop = parseInt(values[4]);
}

function defaultrosmapwindowpos() {
	eraseCookie("rosmapwindow");
}

function setwaypoint(pose) {
	mapshowwaypoints = true;
	if (document.getElementById("rosmap_menu_over").style.display == "none") return;
	if (pose==null) pose = [robotx, roboty, robotth];
	pendingwaypoint = pose;
	var str = "<a class='blackbg' href='javascript: rosmaparrow(&quot;cancel&quot;)'>";
	str += "<span class='cancelbox'><b>X</b></span> ";
	str += "CANCEL</a> &nbsp; name: "; 
	str += "<input id='waypointname' class='inputbox' type='text' size='15' name='waypointname' "; 
	str += "onfocus='keyboard(&quot;disable&quot;); this.style.backgroundColor=&quot;#000000&quot;' "; 
	str += "onblur='keyboard(&quot;enable&quot;); this.style.backgroundColor=&quot;#151515&quot;' ";
	str += "onKeyPress='if (keypress(event)==13) { savewaypoint(); }'>";
	str += "&nbsp; <a class='blackbg' href='javascript: savewaypoint()'>";
	str += "<span class='cancelbox'>&#x2714;</span> SAVE</a>";
	document.getElementById("rosmapinfobar").innerHTML = str;
	document.getElementById("waypointname").focus();
}

function savewaypoint() {
	var name = document.getElementById("waypointname").value;
	name = name.replace(/(\s|_)/g, '&nbsp;');
	name = name.replace(/,/g, '');
	waypoints.push(name);
	waypoints.push.apply(waypoints, pendingwaypoint);
	rosmaparrow("cancel"); // this function includes set pendingwaypoint = null
	writewaypointstofile();
}

function writewaypointstofile() {
	if (waypoints.length == 0) return;
//	if (!confirm("Save Waypoints\n\nThis will overwrite any previous saves\nAre you Sure?")) return;
	
	var str = "";
	for (var i = 0 ; i <= waypoints.length - 4 ; i += 4) {
		var wpm = torosmeters([waypoints[i+1], waypoints[i+2], waypoints[i+3]]);
		str += waypoints[i]+","+wpm[0]+","+wpm[1]+","+wpm[2]+","
	}
	str = str.replace(/,$/,'');
	callServer("savewaypoints", str);
}

function drawmapwaypoints() {
	var waypointcanvas = document.getElementById("rosmapwaypoints");
	if ((waypoints.length == 0 && pendingwaypoint == null) || !mapshowwaypoints) {
		waypointcanvas.width = 0;
		waypointcanvas.height = 0;
		return;
	}
	
	var points = waypoints.slice(0);
	if (pendingwaypoint != null) {
		points.push("new&nbsp;waypoint"); // temp title
		points.push.apply(points, pendingwaypoint); 
	}
	
	
	waypointcanvas.width = mapimgdivwidth;
	waypointcanvas.height = mapimgdivheight;
	
	var context = waypointcanvas.getContext('2d');
	
	var linewidth = 3;
	var fill = "#ffffff";
	var stroke = "#0000ff";
	var r = 5;
	context.font = '15px Arial';
	context.textAlign = "center";
	context.strokeStyle = stroke;
	context.lineWidth = linewidth;
	
	for (var i = 0 ; i <= points.length - 4 ; i += 4) {
		var x = points[i+1]*mapzoom + mapimgleft;
		var y = points[i+2]*mapzoom + mapimgtop;
		context.translate(x, y);
		
		// circle
		context.beginPath();
		context.arc(0, 0, r, 0, 2 * Math.PI, false);
		context.fillStyle = fill;
		context.fill();
		context.stroke();
				
		context.rotate(points[i+3]);
		
		// arrow
		context.beginPath();
		context.moveTo(r, 0);
		context.lineTo(r + 30, 0);
		context.stroke();
		context.beginPath();
		context.moveTo(r + 24,6);
		context.lineTo(r + 30,0);
		context.lineTo(r + 24,-6);
		context.stroke();

		context.rotate(-points[i+3])
		
		context.fillStyle = "#ddddff";
		context.fillText(points[i].replace(/&nbsp;/g, ' '),0,-9);

		context.translate(-x, -y);

	}
}

function waypointsmenu() {
	if (waypoints.length == 0) { 
		message("waypoints unavailble","orange");
		return;
	}
	
	mapshowwaypoints = true;
	str = document.getElementById("waypoints_menu").innerHTML;
	
	if (waypoints.length ==0) str += "waypoints unavailable";
	else {
			str+="<table>"
		for (var i = 0 ; i <= waypoints.length - 4 ; i += 4) {
			str += "<tr valign='top'><td>"
			str += "<b>"+waypoints[i]+"</b> &nbsp; &nbsp; &nbsp; ";
			
			str += "</td><td>"

			str += "<a class='blackbg' href='javascript: waypointenternewname("+i+");'>";
			str += "rename</a> &nbsp; ";

			str += "<a class='blackbg' href='javascript: waypointdelete("+i+");'>delete</a> &nbsp; ";
			
			str += "<a class='blackbg' href='javascript: gotowaypoint("+i+");'>drive to</a> <br>";
			
			str += "<div id='waypointrenamediv"+i+"' style='display: none'>";
			str += "<input id='waypointrename"+i+"' class='inputbox' type='text' size='15' "; 
			str += "onfocus='keyboard(&quot;disable&quot;); this.style.backgroundColor=&quot;#000000&quot;' "; 
			str += "onblur='keyboard(&quot;enable&quot;); this.style.backgroundColor=&quot;#151515&quot;' ";
			str += "onKeyPress='if (keypress(event)==13) { renamewaypoint("+i+"); }'>";
			str += "&nbsp; <a href='javascript: renamewaypoint("+i+")'>";
			str += "<span class='cancelbox'>&#x2714;</span> SAVE</a>&nbsp; ";
			str += "<a class='blackbg' href='javascript: closebox(&quot;waypointrenamediv"+i+"&quot;);'>";
			str += "<span class='cancelbox'><b>X</b></span> ";
			str += "CANCEL</a> </div>"; 
			
			str += "<table><tr><td style='height: 4px'></td></tr></table>";
			
			str += "</td></tr>";
	
		}
	}
	
	popupmenu("menu","show",null,null,str);
}

function waypointenternewname(i) {
	openbox("waypointrenamediv"+i);
	document.getElementById("waypointrename"+i).focus();
}

function waypointdelete(i) {
	if (!confirm("Delete waypoint: "+waypoints[i].replace(/&nbsp;/g, ' ')+"\n\nAre you sure?")) return;
	waypoints.splice(i, 4);
	writewaypointstofile();
	waypointsmenu();
}

function renamewaypoint(i) {
	var newname = document.getElementById("waypointrename"+i).value;
//	var oldname = waypoints[i].replace(/&nbsp;/g, ' ')
//	if (!confirm("Rename waypoint: "+oldname+"\nto be: "+newname+"\nAre you sure?")) return;
	waypoints[i] = newname.replace(/(\s|_)/g, '&nbsp;');
	waypoints[i] = waypoints[i].replace(/,/g, '');
	writewaypointstofile();
	closebox("waypointrenamediv"+i);
	waypointsmenu();
}

function gotowaypoint(i) {
//	if (!confirm("Drive to: "+waypoints[i]+"\n\nAre you sure?")) return;
	var pose = [waypoints[i+1], waypoints[i+2], waypoints[i+3]];
	rosmapsetgoal(pose);
}

function routesmenu() {
	str = document.getElementById("routes_menu").innerHTML;
	
	if (routesxml == null) openxmlhttp("frameGrabHTTP?mode=routesload", routesload);
	else routespopulate(routesxml);
	
	popupmenu("menu","show",null,null,str);
}

function routesload() {
	if (xmlhttp.readyState==4) {// 4 = "loaded"
		if (xmlhttp.status==200) {// 200 = OK
			routesxml = xmlhttp.responseText;
			if (routesxml != "") routespopulate(routesxml);
		}
	}
}

function routespopulate(str) {
	
	
}


