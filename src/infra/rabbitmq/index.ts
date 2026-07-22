/** **********************************************************
 * This is a module facade.                                  *
 * Export only what is allowed to be used externally.        *
 * Do not use wildcard exports.                              *
 * Do not export *.app.module.ts here; import them directly. *
 *********************************************************** */

export { ErrorMapper } from './error.mapper';
export { AmqpConnectionLostLoggable } from './loggable/amqp-connection-lost.loggable';
export { RpcTimeoutException } from './loggable/rpc-timeout.exception';
export { RABBITMQ_CONFIG_TOKEN, RabbitMqConfig } from './rabbitmq.config';
export { RabbitMQWrapperModule, RabbitMQWrapperTestModule } from './rabbitmq.module';
export { RpcError, RpcMessage } from './rpc-message';
export { RpcMessageProducer } from './rpc-message-producer';
