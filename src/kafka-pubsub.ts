import { Kafka, CompressionTypes, CompressionCodecs } from "kafkajs"
const SnappyCodec = require("./snappy")
import { PubSubEngine } from 'graphql-subscriptions'
import { PubSubAsyncIterator } from './pubsub-async-iterator'
import { v4 as uuid } from 'uuid'
import { DEFAULT_ENCODING } from 'crypto'

CompressionCodecs[CompressionTypes.Snappy] = SnappyCodec

export interface IKafkaOptions {
  topic: string
  host: string
  port: string
  groupId?: any,
  globalConfig?: object,
}

export interface IKafkaProducer {
  write: (input: Buffer) => any
}

export interface IKafkaTopic {
  readStream: any
  writeStream: any
}


export class KafkaPubSub implements PubSubEngine {
  protected producer: any
  protected consumer: any
  protected options: any
  protected subscriptionMap: { [subId: number]: [string, Function] }
  protected channelSubscriptions: { [channel: string]: Array<number> }
  protected kafkaClient: any

  constructor(options: IKafkaOptions) {
    this.options = options
    this.subscriptionMap = {}
    this.channelSubscriptions = {}
    this.kafkaClient = this.createClient()
    this.consumer = this.createConsumer(this.options.topic)
  }

  public publish(triggerName: string, payload: any) {
    // only create producer if we actually publish something
    this.producer = this.producer || this.createProducer()
    return this.producer.send({ topic: triggerName, messages: payload, compression: CompressionTypes.Snappy })
  }

  public subscribe(
    channel: string,
    onMessage: Function,
    options?: Object
): Promise<number> {
    const index = Object.keys(this.subscriptionMap).length
    this.subscriptionMap[index] = [channel, onMessage]
    this.channelSubscriptions[channel] = [
      ...(this.channelSubscriptions[channel] || []), index
    ]
    return Promise.resolve(index)
  }

  public unsubscribe(index: number) {
    const [channel] = this.subscriptionMap[index]
    this.channelSubscriptions[channel] = this.channelSubscriptions[channel].filter(subId => subId !== index)
  }

  public asyncIterator<T>(triggers: string | string[]): AsyncIterator<T> {
    return new PubSubAsyncIterator<T>(this, triggers)
  }

  private onMessage(channel: string, message) {
    const subscriptions = this.channelSubscriptions[channel]
    if (!subscriptions) { return } // no subscribers, don't publish msg
    for (const subId of subscriptions) {
      const [cnl, listener] = this.subscriptionMap[subId]
      listener(message)
    }
  }

  brokerList(){
    return this.options.port ? `${this.options.host}:${this.options.port}` : this.options.host
  }

  private createClient() {
    return new Kafka({
      brokers: [ `${this.options.host}:${this.options.port}` ],
      clientId: uuid(),
    })
  }

  private async createProducer() {
    let producer = this.kafkaClient.producer()
    await producer.connect()

    return producer
  }

  private async createConsumer(topic: string) {
    let consumer = this.kafkaClient.consumer({ groupId: uuid() })
    await consumer.connect()
    await consumer.subscribe({ topic: topic })

    consumer.run({ eachMessage: async ({ topic, message }) => this.onMessage(topic, message) })
    
    return consumer
  }
}
