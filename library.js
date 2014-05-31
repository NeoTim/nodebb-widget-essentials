(function(module) {
	"use strict";

	var async = require('async'),
		fs = require('fs'),
		path = require('path'),
		categories = module.parent.require('./categories'),
		user = module.parent.require('./user'),
		plugins = module.parent.require('./plugins'),
		topics = module.parent.require('./topics'),
		translator = module.parent.require('../public/src/translator'),
		templates = module.parent.require('../public/src/templates'),
		app;


	var Widget = {
		templates: {}
	};

	Widget.renderHTMLWidget = function(widget, callback) {
		var html = widget.data.html;

		callback(null, html);
	};

	Widget.renderTextWidget = function(widget, callback) {
		var parseAsPost = !!widget.data.parseAsPost,
			text = widget.data.text;

		if (parseAsPost) {
			plugins.fireHook('filter:post.parse', text, function(err, text) {
				callback(err, text);
			});
		} else {
			callback(null, text.replace(/\r\n/g, "<br />"));
		}
	};

	Widget.renderRecentViewWidget = function(widget, callback) {
		topics.getLatestTopics(widget.uid, 0, 19, 'month', function (err, data) {
			if(err) {
				return callback(err);
			}

			app.render('recent', data, function(err, html) {
				html = html.replace(/<ol[\s\S]*?<br \/>/, '').replace('<br>', '');

				translator.translate(html, function(translatedHTML) {
					callback(err, translatedHTML);
				});
			});
		});
	};

	Widget.renderRecentRepliesWidget = function(widget, callback) {
		var html = Widget.templates['recentreplies.tpl'];

		html = templates.parse(html, {cid: widget.data.cid || false});

		callback(null, html);
	};

	Widget.renderActiveUsersWidget = function(widget, callback) {
		var html = Widget.templates['activeusers.tpl'], cid;

		if (widget.data.cid) {
			cid = widget.data.cid;
		} else {
			var match = widget.area.url.match('[0-9]+');
			cid = match ? match[0] : 1;
		}

		categories.getActiveUsers(cid, function(err, uids) {
			user.getMultipleUserFields(uids, ['uid', 'username', 'userslug', 'picture'], function(err, users) {
				html = templates.parse(html, {active_users: users});

				callback(err, html);
			});
		});
	};

	Widget.renderModeratorsWidget = function(widget, callback) {
		var html = Widget.templates['moderators.tpl'], cid;

		if (widget.data.cid) {
			cid = widget.data.cid;
		} else {
			var match = widget.area.url.match('[0-9]+');
			cid = match ? match[0] : 1;
		}

		categories.getModerators(cid, function(err, moderators) {
			html = templates.parse(html, {moderators: moderators});

			callback(err, html);
		});
	};

	Widget.renderForumStatsWidget = function(widget, callback) {
		var html = Widget.templates['forumstats.tpl'];

		html = templates.parse(html, {statsClass: widget.data.statsClass});

		translator.translate(html, function(translatedHTML) {
			callback(null, translatedHTML);
		});
	};

	Widget.renderRecentPostsWidget = function(widget, callback) {
		var html = Widget.templates['recentposts.tpl'];

		html = templates.parse(html, {
			numPosts: widget.data.numPosts || 8,
			duration: widget.data.duration || 'day'
		});

		callback(null, html);
	};

	Widget.renderRecentTopicsWidget = function(widget, callback) {
		var html = Widget.templates['recenttopics.tpl'];

		html = templates.parse(html, {
			numTopics: widget.data.numTopics || 8,
			duration: widget.data.duration || 'day'
		});

		callback(null, html);
	};

	Widget.renderCategories = function(widget, callback) {
		var html = Widget.templates['categories.tpl'];

		categories.getVisibleCategories(widget.uid, function(err, data) {
			html = templates.parse(html, {categories: data});

			callback(err, html);
		});
	};

	Widget.renderPopularTags = function(widget, callback) {
		var html = Widget.templates['populartags.tpl'];
		console.log(widget);
		var numTags = widget.data.numTags || 8;
		topics.getTags(0, numTags - 1, function(err, tags) {
			if (err) {
				return callback(err);
			}

			html = templates.parse(html, {tags: tags});

			callback(err, html);
		});
	};

	Widget.defineWidgets = function(widgets, callback) {
		widgets = widgets.concat([
			{
				widget: "html",
				name: "HTML",
				description: "Any text, html, or embedded script.",
				content: Widget.templates['admin/html.tpl']
			},
			{
				widget: "text",
				name: "Text",
				description: "Text, optionally parsed as a post.",
				content: Widget.templates['admin/text.tpl']
			},
			{
				widget: "recentreplies",
				name: "Recent Replies",
				description: "List of recent replies in a category.",
				content: Widget.templates['admin/categorywidget.tpl']
			},
			{
				widget: "activeusers",
				name: "Active Users",
				description: "List of active users in a category.",
				content: Widget.templates['admin/categorywidget.tpl']
			},
			{
				widget: "moderators",
				name: "Moderators",
				description: "List of moderators in a category.",
				content: Widget.templates['admin/categorywidget.tpl']
			},
			{
				widget: "forumstats",
				name: "Forum Stats",
				description: "Lists user, topics, and post count.",
				content: Widget.templates['admin/forumstats.tpl']
			},
			{
				widget: "recentposts",
				name: "Recent Posts",
				description: "Lists the latest posts on your forum.",
				content: Widget.templates['admin/recentposts.tpl']
			},
			{
				widget: "recenttopics",
				name: "Recent Topics",
				description: "Lists the latest topics on your forum.",
				content: Widget.templates['admin/recenttopics.tpl']
			},
			{
				widget: "recentview",
				name: "Recent View",
				description: "Renders the /recent page",
				content: Widget.templates['admin/defaultwidget.tpl']
			},
			{
				widget: "categories",
				name: "Categories",
				description: "Lists the categories on your forum",
				content: Widget.templates['admin/categories.tpl']
			},
			{
				widget:"populartags",
				name:"Popular Tags",
				description:"Lists popular tags on your forum",
				content: Widget.templates['admin/populartags.tpl']
			}
		]);

		callback(null, widgets);
	};

	Widget.init = function(express, middleware, controllers) {
		app = express;

		var templatesToLoad = [
			"recentreplies.tpl", "activeusers.tpl", "moderators.tpl", "forumstats.tpl", "recentposts.tpl", "recenttopics.tpl",
			"categories.tpl", "populartags.tpl",
			"admin/categorywidget.tpl", "admin/forumstats.tpl", "admin/html.tpl", "admin/text.tpl", "admin/recentposts.tpl",
			"admin/recenttopics.tpl", "admin/defaultwidget.tpl", "admin/categories.tpl", "admin/populartags.tpl"
		];

		function loadTemplate(template, next) {
			fs.readFile(path.resolve(__dirname, './public/templates/' + template), function (err, data) {
				if (err) {
					console.log(err.message);
					return next(err);
				}
				Widget.templates[template] = data.toString();
				next(err);
			});
		}

		async.each(templatesToLoad, loadTemplate);
	};

	module.exports = Widget;
}(module));