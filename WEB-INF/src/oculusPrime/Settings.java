package oculusPrime;

import java.io.*;
import java.util.HashMap;
import java.util.UUID;

import oculusPrime.State.values;

public class Settings {

	public final static String sep = System.getProperty("file.separator");
	public final static String redhome = System.getenv("RED5_HOME");
	public final static String framefile = System.getenv("RED5_HOME") + sep+"webapps"+sep+"oculus"+sep+"images"+sep+"framegrab.jpg";
	public final static String settingsfile = redhome+sep+"conf"+sep+"oculus_settings.txt";
	public final static String stdout = redhome+sep+"log"+sep+"jvm.stdout";
	
	// public static String ftpconfig = redhome+sep+"conf"+sep+"ftp.properties";
	// public static String loginactivity = redhome+sep+"log"+sep+"loginactivity.txt";
	// public final static String powerlog = redhome+sep+"log"+sep+"power.log";
	
	public final static String DISABLED= "disabled";
	public final static String ENABLED = "enabled";
	public static final int ERROR = -1;
	public static final String FALSE = "false";
	public static final String TRUE = "true";
		
	private static Settings singleton = null;
	public static Settings getReference() {
		if (singleton == null) singleton = new Settings();
		return singleton;
	}
	
	private HashMap<String, String> settings = new HashMap<String, String>(); 
	
	private Settings(){
		
		// be sure of basic configuration 
		if(! new File(settingsfile).exists()) createFile(settingsfile); 
		
		importFile();
	}
	
	private void importFile(){
		try {
			String line;
			FileInputStream filein = new FileInputStream(settingsfile);
			BufferedReader reader = new BufferedReader(new InputStreamReader(filein));
			while ((line = reader.readLine()) != null) {
				String items[] = line.split(" ");
				settings.put(items[0], items[1]);
			}
			reader.close();
			filein.close();
		} catch (Exception e) {
			Util.log("importFile: " + e.getMessage(), this);
		}
	}
	
	public boolean getBoolean(String key) {
		if (key == null) return false;
		String str = readSetting(key);
		if (str == null) return false;
		if (str.toUpperCase().equals("YES")) return true;
		else if (str.equalsIgnoreCase(TRUE)) return true;
		return false;
	}

	public int getInteger(String key) {

		String ans = null;
		int value = ERROR;

		try {
			ans = readSetting(key);
			value = Integer.parseInt(ans);
		} catch (Exception e) {
			return ERROR;
		}

		return value;
	}

	public double getDouble(String key) {

		String ans = null;
		double value = ERROR;

		try {
			ans = readSetting(key);
			value = Double.parseDouble(ans);
		} catch (Exception e) {
			return ERROR;
		}

		return value;
	}

	public String readSetting(String str) {
		
		if(settings.containsKey(str)) return settings.get(str);
	
		FileInputStream filein;
		String result = null;
		try {

			filein = new FileInputStream(settingsfile);
			BufferedReader reader = new BufferedReader(new InputStreamReader(filein));
			String line = "";
			while ((line = reader.readLine()) != null) {
				String items[] = line.split(" ");
				if(items.length>=2){
					if ((items[0].toUpperCase()).equals(str.toUpperCase())) {
						result = items[1];
					}
				} // else throw new Exception("can NOT readSetting("+str+")");
			}
			reader.close();
			filein.close();
		} catch (Exception e) {
			Util.log("readSetting: " + e.getMessage(), this);
			return null; 
		}
		
		// don't let string "null" be confused for actually a null, error state  
		if(result!=null) if(result.equalsIgnoreCase("null")) result = null;
		
		return result;
	}

	@Override
	public String toString(){
		
		String result = new String();
		for (GUISettings factory : GUISettings.values()) {
			String val = readSetting(factory.toString());
			if (val != null) // if( ! val.equals("null")) 
				result += factory.toString() + " " + val + "<br>"; // "\n\r";
		}
	
		for (ManualSettings ops : ManualSettings.values()) {
			String val = readSetting(ops.toString());
			if (val != null)  { // never send out plain text passwords 
				if( ! ops.equals(ManualSettings.email_password)) // { val = "***"; }
					result += ops.toString() + " " + val + "<br>"; // "\n\r";
			}
		}
		
		return result;
	}
	
	public synchronized void createFile(String path) {
		try {
			
			Util.log("creating "+path.toString(), this);
			
			FileWriter fw = new FileWriter(new File(path));
			
			fw.append("# GUI settings \r\n");
			for (GUISettings factory : GUISettings.values()) {
				fw.append(factory.toString() + " " + GUISettings.getDefault(factory) + "\r\n");
			}
			
			fw.append("# manual settings \r\n");
			for (ManualSettings ops : ManualSettings.values()) {
				fw.append(ops.toString() + " " + ManualSettings.getDefault(ops) + "\r\n");
			}
			
			fw.append("# user list \r\n");
			fw.append("salt "+UUID.randomUUID().toString() + "\r\n");
			fw.close();

		} catch (Exception e) {
			e.printStackTrace(System.out);
		}
	}
	
	/** Organize the settings file into 3 sections. Use Enums's to order the file */
	public synchronized void writeFile(){ // String path) {
		
		try {
			
			final String temp = redhome + sep+"conf"+sep+"oculus_created.txt";
			FileWriter fw = new FileWriter(new File(temp));
			
			fw.append("# gui settings \r\n");
			for (GUISettings factory : GUISettings.values()) {
				String val = readSetting(factory.toString());
				if (val != null) {
					fw.append(factory.toString() + " " + val + "\r\n");
				} 
				else {
					fw.append(factory.toString() + " " + GUISettings.getDefault(factory) + "\r\n");
				}
			}
			
			fw.append("# manual settings \r\n");
			for (ManualSettings ops : ManualSettings.values()) {
				String val = readSetting(ops.toString());
				if (val != null){
					fw.append(ops.toString() + " " + val + "\r\n");
				} 
				else {
					fw.append(ops.toString() + " " + ManualSettings.getDefault(ops) + "\r\n");
				}
			}

			fw.append("# user list \r\n");
			if(readSetting("salt") != null) { fw.append("salt " + readSetting("salt") + "\r\n"); }
			if(readSetting("user0")!=null){
				String[][] users = getUsers();
				for (int j = 0; j < users.length; j++) {
					fw.append("user" + j + " " + users[j][0] + "\r\n");
					fw.append("pass" + j + " " + users[j][1] + "\r\n");
				}
			} 
			fw.close();
			
			// now swap temp for real file
			new File(settingsfile).delete();
			new File(temp).renameTo(new File(settingsfile));
			new File(temp).delete();

			importFile();
			
		} catch (Exception e) {
			Util.log("Settings.writeFile(): " + e.getMessage(), this);
		}
	}

	private String[][] getUsers() {

		int i = 0; // count users
		for (;; i++)
			if (readSetting("user" + i) == null)
				break;

		// System.out.println("found: " + i);
		String[][] users = new String[i][2];

		for (int j = 0; j < i; j++) {
			users[j][0] = readSetting("user" + j);
			users[j][1] = readSetting("pass" + j);
		}

		return users;
	}
 
	public void writeSettings(String setting, int value) {
		String str = null;
		try {
			str = Integer.toString(value);
		} catch (Exception e) {
			return;
		}

		if (str != null) writeSettings(setting, str);
	}
	
	public void writeSettings(ManualSettings setting, String str) {
		if (str != null) writeSettings(setting, str);
	}
	
	/**
	 * Modify value of existing setting. read whole file, replace line while
	 * you're at it, write whole file
	 * 
	 * @param setting
	 * @param value
	 */
	public synchronized void writeSettings(String setting, String value) {
		value = value.trim();
		settings.put(setting, value);
		FileInputStream filein;
		String[] lines = new String[999];
		try {

			filein = new FileInputStream(settingsfile);
			BufferedReader reader = new BufferedReader(new InputStreamReader(filein));
			int i = 0;
			while ((lines[i] = reader.readLine()) != null) {
				String items[] = lines[i].split(" ");
				if(items.length==2){
					if ((items[0].toUpperCase()).equals(setting.toUpperCase())) {
						lines[i] = setting + " " + value;
					} // else Util.log("error wwritting: "+lines[0], this);
				}
				i++;
			}
			filein.close();
		} catch (Exception e) {
			e.printStackTrace();
		}

		FileOutputStream fileout;
		try {
			fileout = new FileOutputStream(settingsfile);
			for (int n = 0; n < lines.length; n++) {
				if (lines[n] != null) {
					new PrintStream(fileout).println(lines[n]);
				}
			}
			fileout.close();
		} catch (Exception e) {
			e.printStackTrace();
		}
	}

	/**
	 * read whole file, add single line, write whole file
	 * 
	 * @param setting
	 * @param value
	 */
	public void newSetting(String setting, String value) {

		setting = setting.trim(); // remove trailing whitespace
		value = value.trim();

		FileInputStream filein;
		String[] lines = new String[999];
		try {
			filein = new FileInputStream(settingsfile);
			BufferedReader reader = new BufferedReader(new InputStreamReader(filein));
			int i = 0;
			while ((lines[i] = reader.readLine()) != null) {
				lines[i] = lines[i].replaceAll("\\s+$", ""); 
				if (!lines[i].equals("")) {
					i++;
				}
			}
			filein.close();
		} catch (Exception e) {
			e.printStackTrace();
		}

		FileOutputStream fileout;
		try {
			fileout = new FileOutputStream(settingsfile);
			for (int n = 0; n < lines.length; n++) {
				if (lines[n] != null) {
					new PrintStream(fileout).println(lines[n]);
				}
			}
			new PrintStream(fileout).println(setting + " " + value);
			fileout.close();
		} catch (Exception e) {
			e.printStackTrace();
		}
	}

	public void deleteSetting(String setting) {
		// read whole file, remove offending line, write whole file
		setting = setting.replaceAll("\\s+$", ""); // remove trailing whitespace
		FileInputStream filein;
		String[] lines = new String[999];
		try {
			filein = new FileInputStream(settingsfile);
			BufferedReader reader = new BufferedReader(new InputStreamReader(
					filein));
			int i = 0;
			while ((lines[i] = reader.readLine()) != null) {
				String items[] = lines[i].split(" ");
				if ((items[0].toUpperCase()).equals(setting.toUpperCase())) {
					lines[i] = null;
				}
				i++;
			}
			filein.close();
		} catch (Exception e) {
			e.printStackTrace();
		}

		FileOutputStream fileout;
		try {
			fileout = new FileOutputStream(settingsfile);
			for (int n = 0; n < lines.length; n++) {
				if (lines[n] != null) {
					new PrintStream(fileout).println(lines[n]);
				}
			}
			fileout.close();
		} catch (Exception e) {
			e.printStackTrace();
		}
	}

	public String readRed5Setting(String str) {
		String filenm = System.getenv("RED5_HOME") + sep+"conf"+sep+"red5.properties";
		FileInputStream filein;
		String result = null;
		try {
			filein = new FileInputStream(filenm);
			BufferedReader reader = new BufferedReader(new InputStreamReader(
					filein));
			String line = "";
			while ((line = reader.readLine()) != null) {
				String s[] = line.split("=");
				if (s[0].equals(str)) {
					result = s[1];
				}
			}
			filein.close();
		} catch (Exception e) {
			e.printStackTrace();
		}
		return result;
	}

	public void writeRed5Setting(String setting, String value) { 
		String filenm = System.getenv("RED5_HOME") + sep+"conf"+sep+"red5.properties";
		value = value.replaceAll("\\s+$", ""); // remove trailing whitespace
		FileInputStream filein;
		String[] lines = new String[999];
		try {
			filein = new FileInputStream(filenm);
			BufferedReader reader = new BufferedReader(new InputStreamReader(filein));
			int i = 0;
			while ((lines[i] = reader.readLine()) != null) {
				String items[] = lines[i].split("=");
				if ((items[0].toUpperCase()).equals(setting.toUpperCase())) {
					lines[i] = setting + "=" + value;
				}
				i++;
			}
			filein.close();
		} catch (Exception e) {
			e.printStackTrace();
		}

		FileOutputStream fileout;
		try {
			fileout = new FileOutputStream(filenm);
			for (int n = 0; n < lines.length; n++) {
				if (lines[n] != null) {
					new PrintStream(fileout).println(lines[n]);
				}
			}
			fileout.close();
		} catch (Exception e) {
			e.printStackTrace();
		}
	}
	
	public boolean getBoolean(GUISettings setting) {
		return getBoolean(setting.toString());
	}

	public boolean getBoolean(ManualSettings setting) {
		return getBoolean(setting.toString());
	}
	
	public String readSetting(ManualSettings setting) {
		return readSetting(setting.toString());
	}
	
	public String readSetting(GUISettings setting) {
		return readSetting(setting.toString());
	}
	
	public int getInteger(ManualSettings setting) {
		return getInteger(setting.toString());
	}	
	
	public int getInteger(GUISettings setting) {
		return getInteger(setting.toString());
	}

	public boolean getBoolean(values key) {
		return getBoolean(key.name());
	}

	public double getDouble(GUISettings setting) {
		return getDouble(setting.name());
	}

	public long getLong(ManualSettings setting) {
		return Long.valueOf(readSetting(setting));
	}

	
}
