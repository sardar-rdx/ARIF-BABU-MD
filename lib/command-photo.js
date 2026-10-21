const fs = require('fs');
const path = require('path');

const photoPath = path.join(__dirname, '..', 'assets', 'arif.jpg');
const commandPhoto = fs.readFileSync(photoPath);

const visibleMessageFields = [
    'text',
    'image',
    'video',
    'audio',
    'sticker',
    'document',
    'contact',
    'contacts',
    'location',
    'poll',
    'buttons',
    'sections',
    'product',
    'order'
];

function isVisibleMessage(content) {
    if (typeof content === 'string') return true;
    if (!content || typeof content !== 'object') return false;
    return visibleMessageFields.some(field => content[field] !== undefined);
}

function alreadyHasCommandPhoto(content) {
    const image = content?.image;
    return (Buffer.isBuffer(image) || image instanceof Uint8Array) &&
        Buffer.from(image).equals(commandPhoto);
}

function withCommandPhoto(sock) {
    let photoSent = false;

    return new Proxy(sock, {
        get(target, property) {
            if (property === 'sendMessage') {
                return async (chatId, content, options) => {
                    if (!photoSent && isVisibleMessage(content)) {
                        photoSent = true;

                        if (!alreadyHasCommandPhoto(content)) {
                            try {
                                await Reflect.apply(target.sendMessage, target, [
                                    chatId,
                                    { image: commandPhoto },
                                    options
                                ]);
                            } catch (error) {
                                console.warn('Could not send command photo:', error?.message || error);
                            }
                        }
                    }

                    return Reflect.apply(target.sendMessage, target, [chatId, content, options]);
                };
            }

            const value = Reflect.get(target, property, target);
            return typeof value === 'function' ? value.bind(target) : value;
        }
    });
}

module.exports = { withCommandPhoto };
