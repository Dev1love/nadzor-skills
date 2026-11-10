class Notifier {
  constructor(options = {}) {
    this.options = options;
  }

  send() {
    throw new Error('not implemented');
  }
}

class EmailNotifier extends Notifier {
  send(to, subject, text) {
    console.log(`[email] ${to}: ${subject}\n${text}`);
  }
}

class SmsNotifier extends Notifier {}
class PushNotifier extends Notifier {}
class TelegramNotifier extends Notifier {}

const CHANNELS = { email: EmailNotifier, sms: SmsNotifier, push: PushNotifier, telegram: TelegramNotifier };

class NotifierFactory {
  static create(channel, options = { retries: 3, priority: 'normal', template: 'default' }) {
    const Channel = CHANNELS[channel];
    if (!Channel) throw new Error(`unknown channel ${channel}`);
    return new Channel(options);
  }
}

module.exports = { NotifierFactory };
