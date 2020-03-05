"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", { value: true });
var kafkajs_1 = require("kafkajs");
var SnappyCodec = require("./snappy");
var pubsub_async_iterator_1 = require("./pubsub-async-iterator");
var uuid_1 = require("uuid");
kafkajs_1.CompressionCodecs[kafkajs_1.CompressionTypes.Snappy] = SnappyCodec;
var KafkaPubSub = (function () {
    function KafkaPubSub(options) {
        this.options = options;
        this.subscriptionMap = {};
        this.channelSubscriptions = {};
        this.kafkaClient = this.createClient();
        this.consumer = this.createConsumer(this.options.topic);
    }
    KafkaPubSub.prototype.publish = function (triggerName, payload) {
        this.producer = this.producer || this.createProducer();
        return this.producer.send({ topic: triggerName, messages: payload, compression: kafkajs_1.CompressionTypes.Snappy });
    };
    KafkaPubSub.prototype.subscribe = function (channel, onMessage, options) {
        var index = Object.keys(this.subscriptionMap).length;
        this.subscriptionMap[index] = [channel, onMessage];
        this.channelSubscriptions[channel] = __spreadArrays((this.channelSubscriptions[channel] || []), [
            index
        ]);
        return Promise.resolve(index);
    };
    KafkaPubSub.prototype.unsubscribe = function (index) {
        var channel = this.subscriptionMap[index][0];
        this.channelSubscriptions[channel] = this.channelSubscriptions[channel].filter(function (subId) { return subId !== index; });
    };
    KafkaPubSub.prototype.asyncIterator = function (triggers) {
        return new pubsub_async_iterator_1.PubSubAsyncIterator(this, triggers);
    };
    KafkaPubSub.prototype.onMessage = function (channel, message) {
        var subscriptions = this.channelSubscriptions[channel];
        if (!subscriptions) {
            return;
        }
        for (var _i = 0, subscriptions_1 = subscriptions; _i < subscriptions_1.length; _i++) {
            var subId = subscriptions_1[_i];
            var _a = this.subscriptionMap[subId], cnl = _a[0], listener = _a[1];
            listener(message);
        }
    };
    KafkaPubSub.prototype.brokerList = function () {
        return this.options.port ? this.options.host + ":" + this.options.port : this.options.host;
    };
    KafkaPubSub.prototype.createClient = function () {
        return new kafkajs_1.Kafka({
            brokers: [this.options.host + ":" + this.options.port],
            clientId: uuid_1.v4(),
            logLevel: kafkajs_1.logLevel.ERROR
        });
    };
    KafkaPubSub.prototype.createProducer = function () {
        return __awaiter(this, void 0, void 0, function () {
            var producer;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        producer = this.kafkaClient.producer();
                        return [4, producer.connect()];
                    case 1:
                        _a.sent();
                        return [2, producer];
                }
            });
        });
    };
    KafkaPubSub.prototype.parseMessage = function (message) {
        var parsedMessage = {
            key: message.key.toString(),
            value: JSON.parse(message.value.toString()),
            timestamp: message.timestamp,
        };
        return parsedMessage;
    };
    KafkaPubSub.prototype.createConsumer = function (topic) {
        return __awaiter(this, void 0, void 0, function () {
            var consumer;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        consumer = this.kafkaClient.consumer({ groupId: uuid_1.v4() });
                        return [4, consumer.connect()];
                    case 1:
                        _a.sent();
                        return [4, consumer.subscribe({ topic: topic })];
                    case 2:
                        _a.sent();
                        consumer.run({
                            eachMessage: function (_a) {
                                var topic = _a.topic, message = _a.message;
                                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_b) {
                                    return [2, this.onMessage(topic, this.parseMessage(message))];
                                }); });
                            }
                        });
                        return [2, consumer];
                }
            });
        });
    };
    return KafkaPubSub;
}());
exports.KafkaPubSub = KafkaPubSub;
//# sourceMappingURL=kafka-pubsub.js.map