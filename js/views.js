var app = app || {};

var renderTime = function(seconds) {
    if (seconds < 60) {
	return 'less than a minute';
    }
    if (seconds < 90) {
	return 'a minute';
    }
    if (seconds < 3600) {
	return pluralize(seconds/60, 'minute');
    }
    if (seconds < 86400) {
	return pluralize(seconds/3600, 'hour');
    }

    return pluralize(seconds/86400, 'day');
}

var pluralize = function(value, singularUnit) {
    if (value != 1) {
	return Math.ceil(value) + ' ' + singularUnit + 's';
    }
    return Math.ceil(value) + ' ' + singularUnit;
}

app.PendingReminderView = Backbone.View.extend({
    tagName: 'li',
    template: _.template($('#item-template').html()),
    events: {
        'dblclick .what': 'edit',
        'keypress .edit': 'updateOnEnter',
        'blur .edit': 'close',
        'click .destroy': 'clear'
    },
    initialize: function() {
        this.listenTo(this.model, 'change', this.render);
        this.listenTo(this.model, 'destroy', this.remove);
        this.listenTo(app.ReminderManager, 'ribbbon-tick', this.updateRemaining);
    },
    render: function() {
        this.$el.html(this.template(this.model.toJSON()));
        this.$input = this.$('.edit');
        this.$remaining = this.$('.remaining');
        this.updateRemaining();
        return this;
    },
    updateRemaining: function() {
        var when = new Date(this.model.get('when'));
        var now = new Date();
        var remaining = Math.floor((when.getTime() - now.getTime())/1000);
        // Do not display negative values.
        remaining = remaining < 0 ? 0 : remaining;
        this.$remaining.text(renderTime(remaining));
    },
    edit: function() {
        this.$el.addClass('editing');
        this.$input.focus();
    },
    close: function() {
        var value = this.$input.val().trim();

        if (value) {
            this.model.save({what: value});
        }

        this.$el.removeClass('editing');
    },
    updateOnEnter: function(e) {
        if (e.which === 13) {
            this.close();
        }
    },
    clear: function() {
        this.model.destroy();
    }
});

app.AppView = Backbone.View.extend({
    el: '#reminderapp',
    events: {
        'keypress #reminder-text': 'createOnEnter',
        'keypress #reminder-time': 'createOnEnter',
        'click #create-reminder': 'createOnSubmit'
    },
    initialize: function() {
        this.$inputForm = this.$('#reminder-form')[0];
        this.$inputText = this.$('#reminder-text');
        this.$inputTime = this.$('#reminder-time');        
        this.$main = this.$('#main');

        this.listenTo(app.Reminders, 'add', this.addOne);
        this.listenTo(app.Reminders, 'reset', this.addAll);
        this.listenTo(app.Reminders, 'filter', this.filterAll);
        this.listenTo(app.Reminders, 'all', this.render);
        this.listenTo(app.ReminderManager, 'ribbbon-remind', this._showReminder);

        app.Reminders.fetch();
    },
    render: function() {
        if (app.Reminders.length) {
            this.$main.show();

            this.$('#filters li a')
              .removeClass('selected')
              .filter('[href="#/' + (app.Reminders || '') + '"]')
              .addClass('selected');
        } else {
            this.$main.hide();
        }
    },
    _showReminder: function(reminder) {
        var view = new app.AlertReminderView({model: reminder});
        view.once('ribbbon-remind-ack', this._reminderAck);
        view.render();
    },
    _reminderAck: function(reminder) {
        reminder.destroy();
    },
    addOne: function(reminder) {
        var view = new app.PendingReminderView({model: reminder});
        $('#reminder-list').append(view.render().el);
        app.ReminderManager.add(reminder);
    },
    addAll: function() {
        this.$('#reminder-list').html('');
        app.Reminders.each(this.addOne, this);
    },
    filterOne: function(reminder) {
        reminder.trigger('visible');
    },
    filterAll: function() {
        app.Reminders.each(this.filterOne, this);
    },
    newAttributes: function() {
        var time = parseInt(this.$inputTime.val());
        var date = new Date((new Date().getTime())+(time*60000));
        return {
            what: this.$inputText.val().trim(),
            order: app.Reminders.nextOrder(),
            when: date
        }
    },
    createOnEnter: function(e) {
        if (e.which !== 13 || !this.$inputText.val().trim()
            || !this.$inputTime.val().trim()) {
            return;
        }

        this._create();    
        e.preventDefault();            
    },
    createOnSubmit: function(e) {
        if (!this.$inputText.val().trim()
            || !this.$inputTime.val().trim()) {
            return;
        }

        this._create();
        e.preventDefault();
    },
    _create: function() {
        app.Reminders.create(this.newAttributes());
        this.$inputForm.reset();
    }
});

app.AlertReminderView = Backbone.View.extend({
    initialize: function() {

    },
    render: function() {
        alert(this.model.get('what'));
        this.trigger('ribbbon-remind-ack', this.model);
        return this;
    }
});