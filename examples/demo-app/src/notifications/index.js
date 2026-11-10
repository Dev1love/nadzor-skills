class NotificationChannel {
  constructor(options = {}) {
    this.options = options;
  }

  send() {
    throw new Error('not implemented');
  }
}

class EmailChannel extends NotificationChannel {
  send(to, subject, body) {
    console.log(`[email] to=${to} subject="${subject}" body="${body}"`);
    return true;
  }
}

class SmsChannel extends NotificationChannel {}

class PushChannel extends NotificationChannel {}

class TelegramChannel extends NotificationChannel {}

class NotificationFactory {
  static create(type, options) {
    switch (type) {
      case 'email':
        return new EmailChannel(options);
      case 'sms':
        return new SmsChannel(options);
      case 'push':
        return new PushChannel(options);
      case 'telegram':
        return new TelegramChannel(options);
      default:
        throw new Error(`unknown channel: ${type}`);
    }
  }
}

const DEFAULT_OPTIONS = { retries: 3, priority: 'normal', template: 'default', locale: 'ru' };

function send(type, ...args) {
  return NotificationFactory.create(type, DEFAULT_OPTIONS).send(...args);
}

module.exports = { send, NotificationFactory, NotificationChannel };
