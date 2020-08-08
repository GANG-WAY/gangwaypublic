require("./helpers/extenders");

const Sentry = require("@sentry/node"),
	util = require("util"),
	fs = require("fs"),
	readdir = util.promisify(fs.readdir),
	mongoose = require("mongoose");

const config = require("./config");
if(config.apiKeys.sentryDSN){
	Sentry.init({ dsn: config.apiKeys.sentryDSN });
}

// Load Atlanta class
const Atlanta = require("./base/Atlanta"),
	client = new Atlanta();

const init = async () => {

	// Search for all commands
	const directories = await readdir("./commands/");
	client.logger.log(`Loading a total of ${directories.length} categories.`, "log");
	directories.forEach(async (dir) => {
		const commands = await readdir("./commands/"+dir+"/");
		commands.filter((cmd) => cmd.split(".").pop() === "js").forEach((cmd) => {
			const response = client.loadCommand("./commands/"+dir, cmd);
			if(response){
				client.logger.log(response, "error");
			}
		});
	});
    
	client.login(client.config.token); // Log in to the discord api

	// connect to mongoose database
	mongoose.connect(client.config.mongoDB, { useNewUrlParser: true, useUnifiedTopology: true }).then(() => {
		client.logger.log("Connected to the Mongodb database.", "log");
	}).catch((err) => {
		client.logger.log("Unable to connect to the Mongodb database. Error:"+err, "error");
	});

	const languages = require("./helpers/languages");
	client.translations = await languages();
    
	const autoUpdateDocs = require("./helpers/autoUpdateDocs.js");
	autoUpdateDocs.update(client);

};

init();

// if there are errors, log them
client.on("disconnect", () => client.logger.log("Bot is disconnecting...", "warn"))
	.on("reconnecting", () => client.logger.log("Bot reconnecting...", "log"))
	.on("error", (e) => client.logger.log(e, "error"))
	.on("warn", (info) => client.logger.log(info, "warn"));

// if there is an unhandledRejection, log them
process.on("unhandledRejection", (err) => {
	console.error(err);
});
