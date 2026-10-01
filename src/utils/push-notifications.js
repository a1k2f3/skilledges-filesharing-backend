const webpush = require("web-push");
const PushSubscription = require("../schema/PushSubscription");

const sendPushNotification = async ({ recipient, title, message, url = "/dashboard" }) => {
	const publicKey = process.env.WEB_PUSH_PUBLIC_KEY;
	const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;
	if (!publicKey || !privateKey) return;

	webpush.setVapidDetails(process.env.WEB_PUSH_SUBJECT || "mailto:admin@example.com", publicKey, privateKey);
	const subscriptions = await PushSubscription.find({ user: recipient }).select("endpoint keys");
	const payload = JSON.stringify({ title, body: message, url });

	await Promise.all(subscriptions.map(async (subscription) => {
		try {
			await webpush.sendNotification({ endpoint: subscription.endpoint, keys: subscription.keys }, payload);
		} catch (error) {
			if (error.statusCode === 404 || error.statusCode === 410) {
				await subscription.deleteOne();
				return;
			}
			console.warn("Web push notification failed:", error.message);
		}
	}));
};

module.exports = { sendPushNotification };