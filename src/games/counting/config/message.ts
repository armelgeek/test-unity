import type { MessageRegistry } from "../../core/types/bridge-messages.types";

export const MESSAGE_REGISTRY: MessageRegistry = {
    'SetValue': {
        type: 'SetValue',
        direction: 'fromUnity',
    },

    'ChangeList': {
        type: 'ChangeList',
        direction: 'toUnity',
    },
    'LockThousand': {
        type: 'LockThousand',
        direction: 'toUnity',
    },
    'LockHundred': {
        type: 'LockHundred',
        direction: 'toUnity',
    },
    'LockTen': {
        type: 'LockTen',
        direction: 'toUnity',
    },
    'LockUnit': {
        type: 'LockUnit',
        direction: 'toUnity'
    },
    'UnityMessage': {
        type: 'UnityMessage',
        direction: 'fromUnity',
        description: 'Raw string messages from Unity (all messages are sent with this type)'
    },
    'UnityRawMessage': {
        type: 'UnityRawMessage',
        direction: 'fromUnity'
    },
    'SetValueUpdate': {
        type: 'SetValueUpdate',
        direction: 'fromUnity'
    }
};