package oculusPrime;

import java.io.File;
import java.io.IOException;
import java.io.PrintWriter;

import javax.servlet.ServletConfig;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import oculusPrime.State.values;
import oculusPrime.commport.PowerLogger;

public class DashboardServlet extends HttpServlet {
	
	static final long serialVersionUID = 1L;	
	static final String HTTP_REFRESH_DELAY_SECONDS = "3";
	
	NetworkMonitor monitor = NetworkMonitor.getReference();
	Settings settings = Settings.getReference();
	BanList ban = BanList.getRefrence();
	State state = State.getReference();
	
	public void init(ServletConfig config) throws ServletException {
		super.init(config);
	}

	public void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		doGet(request, response);
	}

	public void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		response.setContentType("text/html");
		PrintWriter out = response.getWriter();
	
		if( !request.getServerName().equals("127.0.0.1") && !settings.getBoolean(ManualSettings.developer.name())){
			out.println("this service is for developers only, check settings..");
			out.close();	
			return;
		}
					
		String action = null;
		String router = null; 
		String password = null;
		String view = null;	
		String delay = null;	
		String member = null;	
		
		try {
			view = request.getParameter("view");
			delay = request.getParameter("delay");
			member = request.getParameter("member");	
			action = request.getParameter("action");
			router = request.getParameter("router");
			password = request.getParameter("password");
		} catch (Exception e) {
			Util.debug("doGet(): " + e.getLocalizedMessage(), this);
		}
			
		if(delay == null) delay =  HTTP_REFRESH_DELAY_SECONDS;

		if(password != null){
			monitor.changeWIFI(router, password);
			response.sendRedirect("dashboard"); 
			return;
		}
		
		if(action != null){ 
			
			if(action.equals("connect")  && (router != null)){	
				if(monitor.connectionExists(router)){
					monitor.changeWIFI(router);
					response.sendRedirect("dashboard");                              
					return;
				}
			
				sendLogin(request, response, router);
				return;
			}
		}	
		
		out.println("<html><head><meta http-equiv=\"refresh\" content=\""+ delay + "\"></head><body> \n");

		if(view != null){
			if(view.equalsIgnoreCase("ban")){
				out.println(ban + "<br />\n");
				out.println(ban.tail(30) + "\n");
				out.println("\n</body></html> \n");
				out.close();
			}
			
			if(view.equalsIgnoreCase("state")){
				
				if(member != null) {
					Util.debug("member = " + member);
					out.println(state.get(member.trim()));
				}
				else out.println(state.toHTML() + "\n");
				
				out.println("\n</body></html> \n");
				out.close();
			}
			
			if(view.equalsIgnoreCase("sysout")){
				out.println(new File(Settings.stdout).getAbsolutePath() + "<br />\n");
				out.println(Util.tail(50) + "\n");
				out.println("\n</body></html> \n");
				out.close();
			}
			
			if(view.equalsIgnoreCase("power")){	
				out.println(new File(PowerLogger.powerlog).getAbsolutePath() + "<br />\n");
				out.println(PowerLogger.tail(50) + "\n");
				out.println("\n</body></html> \n");
				out.close();
			}
			
			if(view.equalsIgnoreCase("ros")){
				out.println(rosDashboard() + "\n");
				out.println("\n</body></html> \n");
				out.close();
			}
			
			if(view.equalsIgnoreCase("log")){
				out.println("\nsystem output: <hr>\n");
				out.println(Util.tail(15) + "\n");
				out.println("\n<br />power log: <hr>\n");
				out.println("\n" + PowerLogger.tail(5) + "\n");
				out.println("\n<br />banned addresses: " +  ban + "<hr>\n");
				out.println("\n" + ban.tail(7) + "\n");
				out.println("\n</body></html> \n");
				out.close();
			}
		}
		
		out.println(toDashboard(request.getServerName()+":"+request.getServerPort() + "/oculusPrime/dashboard") + "\n");
		out.println("\n</body></html> \n");
		out.close();	
	}
	
	public void sendLogin(HttpServletRequest request, HttpServletResponse response, String ssid) throws IOException{
		response.setContentType("text/html");
		PrintWriter out = response.getWriter();
		out.println("<html><body> \n\n");
		out.println("connect to: " + ssid);
		out.println("<form method=\"post\">password: <input type=\"password\" name=\"password\"></form>");
		out.println("\n\n </body></html>");
		out.close();
	}
	
	public String toTableHTML(){
		StringBuffer str = new StringBuffer("<table cellspacing=\"10\" border=\"2\"> \n");
		
		str.append("<tr>" 
				+ "<td><b>distanceangle</b><td>" + state.get(values.distanceangle)
				+ "<td><b>direction</b><td>" + state.get(values.direction)
				+ "<td><b>odometry</b><td>" + state.get(values.odometry) 
				+ "</tr> \n");
		
		str.append("<tr>" 
				+ "<td><b>distanceanglettl</b><td>" + state.get(values.distanceanglettl) 
				+ "<td><b>stopbetweenmoves</b><td>" + state.get(values.stopbetweenmoves) 
				+ "<td><b>odometrybroadcast</b><td>" + state.get(values.odometrybroadcast) 
				+ "<td><b>odomturndpms</b><td>" + state.get(values.odomturndpms) 
				+ "</tr> \n");
		
		str.append("<tr>" 
				+ "<td><b>odomturnpwm</b><td>" + state.get(values.odomturnpwm) 
				+ "<td><b>odomupdated</b><td>" + state.get(values.odomupdated) 
				+ "<td><b>odomlinearmpms</b><td>" + state.get(values.odomlinearmpms) 
				+ "<td><b>odomlinearpwm</b><td>" + state.get(values.odomlinearpwm) 
				+ "</tr> \n");
		
		str.append("<tr>"
				+ "<td><b>rosmapinfo</b><td colspan=\"7\">" + state.get(values.rosmapinfo) 
			// 	+ "<td><b>rosamcl</b><td>" + state.get(values.rosamcl) 
			//	+ "<td><b>rosglobalpath</b><td>" + state.state.get(values.rosglobalpath) 
				+ "</tr> \n");
			
		str.append("<tr><td><b>roscurrentgoal</b><td>" + state.get(values.roscurrentgoal) 
				+ "<td><b>rosmapupdated</b><td>" + state.get(values.rosmapupdated) 
			//	+ "<td><b>rosmapwaypoints</b><td>" + state.get(values.rosmapwaypoints) 
				+ "<td><b>navsystemstatus</b><td>" + state.get(values.navsystemstatus)
				+ "</tr> \n");
		
		str.append("<tr>" 
				+ "<td><b>rossetgoal</b><td>" + state.get(values.rossetgoal) 
				+ "<td><b>rosgoalstatus</b><td>" + state.get(values.rosgoalstatus)
				+ "<td><b>rosgoalcancel</b><td>" + state.get(values.rosgoalcancel) 
				+ "<td><b>navigationroute</b><td>" + state.get(values.navigationroute)
				+ "</tr> \n");
		
		str.append("<tr>" 
				+ "<td><b>rosinitialpose</b><td>" + state.get(values.rosinitialpose) 
				+ "<td><b>navigationrouteid</b><td>" + state.get(values.navigationrouteid) 
				+ "</tr> \n");
		
	//	str.append("<tr>"
	//			+ "<td><b>rosmapinfo</b><td colspan\"3\">" + state.get(values.rosmapinfo) 
			//	+ "<td><b>rosamcl</b><td>" + state.get(values.rosamcl) 
			//	+ "<td><b>rosglobalpath</b><td>" + state.get(values.rosglobalpath) 
	//			+ "</tr> \n");
		
		str.append("<tr><td><b>rosmapwaypoints</b><td colspan=\"7\">" + state.get(values.rosmapwaypoints) );
		
		str.append("<tr>" // long line
				+ "<td><b>rosglobalpath</b><td colspan=\"10\">" + state.get(values.rosglobalpath) 
				+ "</tr> \n");
				
		
		
		str.append("\n</table>\n");
		return str.toString();
	}
	public String rosDashboard(){	
		StringBuffer str = new StringBuffer("<table cellspacing=\"10\" border=\"2\"> \n");
		
		str.append("<tr>" 
				+ "<td><b>distanceangle</b><td>" + state.get(values.distanceangle)
				+ "<td><b>direction</b><td>" + state.get(values.direction)
				+ "<td><b>odometry</b><td>" + state.get(values.odometry) 
				+ "</tr> \n");
		
		str.append("<tr>" 
				+ "<td><b>distanceanglettl</b><td>" + state.get(values.distanceanglettl) 
				+ "<td><b>stopbetweenmoves</b><td>" + state.get(values.stopbetweenmoves) 
				+ "<td><b>odometrybroadcast</b><td>" + state.get(values.odometrybroadcast) 
				+ "<td><b>odomturndpms</b><td>" + state.get(values.odomturndpms) 
				+ "</tr> \n");
		
		str.append("<tr>" 
				+ "<td><b>odomturnpwm</b><td>" + state.get(values.odomturnpwm) 
				+ "<td><b>odomupdated</b><td>" + state.get(values.odomupdated) 
				+ "<td><b>odomlinearmpms</b><td>" + state.get(values.odomlinearmpms) 
				+ "<td><b>odomlinearpwm</b><td>" + state.get(values.odomlinearpwm) 
				+ "</tr> \n");
		
		str.append("<tr>"
				+ "<td><b>rosmapinfo</b><td colspan=\"7\">" + state.get(values.rosmapinfo) 
			// 	+ "<td><b>rosamcl</b><td>" + state.get(values.rosamcl) 
			//	+ "<td><b>rosglobalpath</b><td>" + state.get(values.rosglobalpath) 
				+ "</tr> \n");
			
		str.append("<tr><td><b>roscurrentgoal</b><td>" + state.get(values.roscurrentgoal) 
				+ "<td><b>rosmapupdated</b><td>" + state.get(values.rosmapupdated) 
			//	+ "<td><b>rosmapwaypoints</b><td>" + state.get(values.rosmapwaypoints) 
				+ "<td><b>navsystemstatus</b><td>" + state.get(values.navsystemstatus)
				+ "</tr> \n");
		
		str.append("<tr>" 
				+ "<td><b>rossetgoal</b><td>" + state.get(values.rossetgoal) 
				+ "<td><b>rosgoalstatus</b><td>" + state.get(values.rosgoalstatus)
				+ "<td><b>rosgoalcancel</b><td>" + state.get(values.rosgoalcancel) 
				+ "<td><b>navigationroute</b><td>" + state.get(values.navigationroute)
				+ "</tr> \n");
		
		str.append("<tr>" 
				+ "<td><b>rosinitialpose</b><td>" + state.get(values.rosinitialpose) 
				+ "<td><b>navigationrouteid</b><td>" + state.get(values.navigationrouteid) 
				+ "</tr> \n");
		
	//	str.append("<tr>"
	//			+ "<td><b>rosmapinfo</b><td colspan\"3\">" + state.get(values.rosmapinfo) 
			//	+ "<td><b>rosamcl</b><td>" + state.get(values.rosamcl) 
			//	+ "<td><b>rosglobalpath</b><td>" + state.get(values.rosglobalpath) 
	//			+ "</tr> \n");
		
		str.append("<tr><td><b>rosmapwaypoints</b><td colspan=\"7\">" + state.get(values.rosmapwaypoints) );
		
		str.append("<tr>" // long line
				+ "<td><b>rosglobalpath</b><td colspan=\"10\">" + state.get(values.rosglobalpath) 
				+ "</tr> \n");
				
		
		
		str.append("\n</table>\n");
		return str.toString();
	}
	
	public String toDashboard(final String url){
		
		StringBuffer str = new StringBuffer("<table cellspacing=\"15\" border=\"1\">  \n");
		
		String list = "connections <hr> \n";
		String[] ap = monitor.getConnections(); 		
		final String router = "<a href=\"http://" + url + "?action=connect&router=";
		for(int i = 0 ; i < ap.length ; i++) list += (router + ap[i] + "\">" + ap[i] + "</a><br /> \n");
		 
		list += "<hr>access points <hr>  \n";
		ap = monitor.getAccessPoints();		
		final String pw = "<a href=\"http://" + url + "?action=connect&router=";
		for(int i = 0 ; i < ap.length ; i++) list += (pw + ap[i] + "\">" + ap[i] + "</a><br /> \n");
		
		str.append("<tr><td rowspan=\"99\" valign=\"top\">"+ list +"</tr> \n");
		
		str.append("<tr><td><b>ssid </b>" + state.get(values.ssid) + " -- <b>"+ state.get(values.signalspeed) + "</b>" 
				+ "<br /><b>ping </b>" + monitor.getPingTime() + "  ms --   <b>last</b> " + (System.currentTimeMillis()-monitor.getLast()) + "   " 
				+ "<td><b>gate</b> " + state.get(values.gateway)
				+ "<br /><b>eth   </b>" + state.get(values.ethernetaddress)
				+ "<td><b>lan   </b>" + state.get(values.localaddress) 
				+ "<br /><b>wan </b>" + state.get(values.externaladdress)
				+ "</tr> \n");
		
		str.append("<tr><td><b>motor port </b>" + state.get(values.motorport) 
				+ "<td><b>linux mins</b> " + (((System.currentTimeMillis() - state.getLong(values.linuxboot)) / 1000) / 60)
				+ "<td><b>motion </b>" + state.get(values.motionenabled) + " <b>moving </b>" + state.get(values.moving)
				// + " <b>direction </b>" + state.get(values.direction) // + " <td><b>speed </b>" + state.get(values.motorspeed) 
				+ "</tr> \n");
				
		str.append("<tr><td><b>power port </b>" + state.get(values.powerport)
				+ "<td><b>java mins </b>" + (state.getUpTime()/1000)/60  
			//	+ "<td><b>volts </b>" + state.get(values.battvolts) + " <b>life </b> " + state.get(values.batterylife) 
				+ "<td><b>life </b> " + state.get(values.batterylife) + " <b>cpu </b>" + state.get(values.cpu) + "% "
				+ "<b>telnet </b> " + state.get(values.telnetusers) + " </tr> \n");
				
	/*			
		str.append("<tr><td><b>video mode </b>" + state.get(values.videosoundmode) + " <b>stream </b>" + state.get(values.stream)
				+ "<td><b>driverstream </b>" + state.get(values.driverstream) + " <b>volume </b>" + state.get(values.volume)
			    + "<td><b>busy </b>" + state.get(values.framegrabbusy)    odomturnpwm
			    + "<td><b>driver </b>" + state.get(values.driver) 
		        + "<td><b>telnet </b>" + state.get(values.telnetusers) 
				+ "</tr>")
	       	   + "<td><b>booted: </b>" + new Date(getLong(values.boottime)) 
		       + "<td><b>login: </b><td>" + new Date(getLong(values.logintime)) 
				+ "<td><b>linux uptime (minutes) </b>" + (((System.currentTimeMillis() - getLong(values.linuxboot)) / 1000) /60)
		        + "<td><b>java uptime (minutes) </b>" + (getUpTime()/1000)/60 
	*/	
		
		if(state.exists(values.powererror)) str.append("\n<tr><td colspan=\"11\">" + state.get(values.powererror) + "</tr> \n");
		str.append("\n<tr><td colspan=\"11\">" + Util.tailShort(15) + "</tr> \n");		
		str.append("\n</table>\n");
		return str.toString();
	}

}
