var app = app || {};

app.Reminder = Backbone.Model.extend({
    defaults: {
        what: '',
        when: null,
        added: new Date(),
    }
});

var ReminderList = Backbone.Collection.extend({
    model: app.Reminder,
    localStorage: new Backbone.LocalStorage('reminder-backbone'),
    completed: function() {
        return this.filter(function(reminder) {
            return reminder.get('when') < (new Date());
        });
    },
    remaining: function() {
        return this.without.apply(this, this.completed());
    },
    nextOrder: function() {
        if (!this.length) {
            return 1;
        }
        return this.last().get('order') + 1;
    },
    comparator: function(reminder) {
        return reminder.get('order');
    }
});

app.ReminderManager = {
    add: function(reminder) {
        var now = new Date();
        var future = new Date(reminder.get('when'));
        var timeout = future.getTime() - now.getTime();

        if (timeout > 0) {
            var id = setTimeout(this._fire.bind(this, reminder), timeout);
            reminder.once('destroy', this._cancel.bind(this, id));
        }
    },
    _cancel: function(timeoutId) {
        clearTimeout(timeoutId);
    },
    _fire: function(reminder) {
        this.trigger('ribbbon-remind', reminder);
    },
    start: function(tick) {
        // Tick every X seconds
        setInterval(this.trigger.bind(this, 'ribbbon-tick'), tick);
    }
};

_.extend(app.ReminderManager, Backbone.Events);
app.ReminderManager.start(2000); // Tick every 2s

app.Reminders = new ReminderList();
