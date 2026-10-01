const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:3000,http://127.0.0.1:3000"||"https://skilledges-filesharing-frontend.vercel.app")
	.split(",")
	.map((origin) => origin.trim())
	.filter(Boolean);

const corsOptions = {
	origin: (origin, callback) => {
		if (!origin || allowedOrigins.includes(origin)) {
			return callback(null, true);
		}

		return callback(new Error("Origin is not allowed by CORS"));
	},
	credentials: true
};

module.exports = { corsOptions };