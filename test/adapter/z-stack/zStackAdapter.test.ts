import "regenerator-runtime/runtime";
import {Znp} from '../../../src/adapter/z-stack/znp';
import {ZStackAdapter} from '../../../src/adapter';
import {Constants as UnpiConstants} from '../../../src/adapter/z-stack/unpi';
import equals from 'fast-deep-equal';
import * as Constants from '../../../src/adapter/z-stack/constants';
import tmp from 'tmp';
import fs from 'fs';
import * as Zcl from '../../../src/zcl';

const Type = UnpiConstants.Type;
const Subsystem = UnpiConstants.Subsystem;
const NvItemsIds = Constants.COMMON.nvItemIds;

const mockZnpRequest = jest.fn().mockReturnValue({payload: {}});
const mockZnpWaitfor = jest.fn();
const mockZnpOpen = jest.fn();
const mockZnpClose = jest.fn();
const mockQueueExecute = jest.fn().mockImplementation(async (func) => await func());

const mocks = [mockZnpOpen, mockZnpWaitfor, mockZnpRequest, mockZnpClose];

const equalsPartial = (object, expected) => {
    for (const [key, value] of Object.entries(expected)) {
        if (!equals(object[key], value)) {
            return false;
        }
    }

    return true;
}

let znpReceived;
let znpClose;
let dataConfirmCode = 0;

jest.mock('../../../src/adapter/z-stack/znp/znp', () => {
    return jest.fn().mockImplementation(() => {
        return {
            on: (event, handler) => {
                if (event === 'received') {
                    znpReceived = handler;
                } else if (event === 'close') {
                    znpClose = handler;
                }
            },
            open: mockZnpOpen,
            request: mockZnpRequest,
            waitFor: mockZnpWaitfor,
            close: mockZnpClose,
        };
    });
});

jest.mock('../../../src/utils/queue', () => {
    return jest.fn().mockImplementation(() => {
      return {
          execute: mockQueueExecute,
        };
    });
});

const basicMocks = () => {
    mockZnpRequest.mockImplementation((subsystem, command, payload, expectedStatus) => {
        const missing = () => {
            const msg = `Not implemented - ${Subsystem[subsystem]} - ${command} - ${JSON.stringify(payload)}`;
            console.log(msg)
            throw new Error(msg);
        }

        if (subsystem === Subsystem.SYS && command === 'version' && equals(payload, {})) {
            return {payload: {product: 0, revision: "20190425"}};
        } else if (subsystem === Subsystem.SYS && command === 'osalNvRead') {
            if (equalsPartial(payload, {id: NvItemsIds.ZNP_HAS_CONFIGURED_ZSTACK1, offset: 0})) {
                return {payload: {value: Buffer.from([0x55])}};
            } else if (equalsPartial(payload, {id: NvItemsIds.CHANLIST, offset: 0})) {
                return {payload: {value: Buffer.from([0,8,0,0])}};
            } else if (equalsPartial(payload, {id: NvItemsIds.PRECFGKEYS_ENABLE, offset: 0})) {
                return {payload: {value: Buffer.from([0])}};
            } else if (equalsPartial(payload, {id: NvItemsIds.PANID, offset: 0})) {
                return {payload: {value: Buffer.from([networkOptions.panID, 0])}};
            } else if (equalsPartial(payload, {id: NvItemsIds.EXTENDED_PAN_ID, offset: 0})) {
                return {payload: {value: Buffer.from(networkOptions.extenedPanID)}};
            } else {
                missing();
            }
        } else if (subsystem === Subsystem.UTIL && command === 'getDeviceInfo') {
            return {payload: {devicestate: Constants.COMMON.devStates.ZB_COORD, ieeeaddr: '0x123'}};
        } else if (subsystem === Subsystem.ZDO && command === 'activeEpReq') {
            return {};
        } else if (subsystem === Subsystem.ZDO && command === 'simpleDescReq') {
            return {};
        } else if (subsystem === Subsystem.SAPI && command === 'readConfiguration') {
            return {payload: {value: Buffer.from(networkOptions.networkKey)}};
        } else if (subsystem === Subsystem.ZDO && command === 'mgmtPermitJoinReq') {
            return {};
        } else if (subsystem === Subsystem.SYS && command === 'resetReq') {
            return {};
        } else if (subsystem === Subsystem.UTIL && command === 'ledControl') {
            return {};
        } else if (subsystem === Subsystem.ZDO && command === 'nodeDescReq') {
            return {};
        } else if (subsystem === Subsystem.AF && command === 'dataRequest') {
            return {};
        } else if (subsystem === Subsystem.AF && command === 'dataRequestExt') {
            return {};
        } else if (subsystem === Subsystem.ZDO && command === 'extNwkInfo') {
            return {payload: {panid: 20, extendedpanid: 10, channel: 12}};
        } else if (subsystem === Subsystem.ZDO && command === 'mgmtLqiReq') {
            return {};
        } else if (subsystem === Subsystem.ZDO && command === 'mgmtRtgReq') {
            return {};
        } else if (subsystem === Subsystem.ZDO && command === 'bindReq') {
            return {};
        } else if (subsystem === Subsystem.ZDO && command === 'unbindReq') {
            return {};
        } else if (subsystem === Subsystem.ZDO && command === 'mgmtLeaveReq') {
            return {};
        } else {
            missing();
        }
    });

    mockZnpWaitfor.mockImplementation((type, subsystem, command, payload) => {
        const missing = () => {
            const msg = `Not implemented - ${Type[type]} - ${Subsystem[subsystem]} - ${command} - ${JSON.stringify(payload)}`;
            console.log(msg)
            throw new Error(msg);
        }

        if (type === Type.AREQ && subsystem === Subsystem.ZDO && command === 'activeEpRsp') {
            return {payload: {activeeplist: [1, 2, 3, 4, 5, 6, 11]}};
        } else if (type === Type.AREQ && subsystem === Subsystem.ZDO && command === 'stateChangeInd') {
            return {payload: {}};
        } else if (type === Type.AREQ && subsystem === Subsystem.ZDO && command === 'simpleDescRsp') {
            if (equals(payload, {endpoint: 1})) {
                return {payload: {endpoint: 1, profileid: 123, deviceid: 5, inclusterlist: [1], outclusterlist: [2]}};
            } else if (equals(payload, {endpoint: 99})) {
                return {payload: {endpoint: 99, profileid: 123, deviceid: 5, inclusterlist: [1], outclusterlist: [2]}};
            } else {
                return {payload: {endpoint: payload.endpoint, profileid: 124, deviceid: 7, inclusterlist: [8], outclusterlist: [9]}};
            }
        } else if (type === Type.AREQ && subsystem === Subsystem.ZDO && command === 'nodeDescRsp') {
            return {payload: {manufacturercode: payload.nwkaddr * 2, logicaltype_cmplxdescavai_userdescavai: payload.nwkaddr - 1}};
        } else if (type === Type.AREQ && subsystem === Subsystem.AF && command === 'dataConfirm') {
            return {payload: {status: dataConfirmCode}};
        } else if (type === Type.AREQ && subsystem === Subsystem.ZDO && command === 'mgmtLqiRsp' && equals(payload, {srcaddr: 203})) {
            return {payload: {status: 0, neighborlqilist: [{lqi: 10, nwkAddr: 2, extAddr: 3, relationship: 3, depth: 1}, {lqi: 15, nwkAddr: 3, extAddr: 4, relationship: 2, depth: 5}]}};
        } else if (type === Type.AREQ && subsystem === Subsystem.ZDO && command === 'mgmtLqiRsp' && equals(payload, {srcaddr: 204})) {
            return {payload: {status: 1}};
        } else if (type === Type.AREQ && subsystem === Subsystem.ZDO && command === 'mgmtRtgRsp' && equals(payload, {srcaddr: 205})) {
            return {payload: {status: 0, routingtablelist: [{destNwkAddr: 10, routeStatus: 'OK', nextHopNwkAddr: 3}]}};
        } else if (type === Type.AREQ && subsystem === Subsystem.ZDO && command === 'mgmtRtgRsp' && equals(payload, {srcaddr: 206})) {
            return {payload: {status: 1}};
        } else if (type === Type.AREQ && subsystem === Subsystem.ZDO && command === 'bindRsp' && equals(payload, {srcaddr: 301})) {
            return {};
        } else if (type === Type.AREQ && subsystem === Subsystem.ZDO && command === 'unbindRsp' && equals(payload, {srcaddr: 301})) {
            return {};
        } else if (type === Type.AREQ && subsystem === Subsystem.ZDO && command === 'mgmtLeaveRsp' && equals(payload, {srcaddr: 401})) {
            return {};
        } else {
            missing();
        }
    });
}

const networkOptions = {
    panID: 123,
    extenedPanID: [1, 2, 3],
    channelList: [11],
    networkKey: [1,3,5,7,9,11,13,15,0,2,4,6,8,10,12,13],
    networkKeyDistribute: false,
}

const serialPortOptions = {
    baudRate: 800,
    rtscts: false,
    path: 'dummy',
};


describe('zStackAdapter', () => {
    let adapter;

    beforeEach(() => {
        adapter = new ZStackAdapter(networkOptions, serialPortOptions, 'backup.json');
        mocks.forEach((m) => m.mockRestore());
        mockQueueExecute.mockClear();
        jest.useRealTimers();
        dataConfirmCode = 0;
        networkOptions.networkKeyDistribute = false;
    });

    it('Call znp constructor', async () => {
       expect(Znp).toBeCalledWith("dummy", 800, false);
    });

    it('Start zStack 3.x.0 initialize', async () => {
        mockZnpRequest.mockImplementation((subsystem, command, payload, expectedStatus) => {
            const missing = () => {
                const msg = `Not implemented - ${Subsystem[subsystem]} - ${command} - ${JSON.stringify(payload)}`;
                console.log(msg)
                throw new Error(msg);
            }

            if (subsystem === Subsystem.SYS && command === 'version' && equals(payload, {})) {
                return {payload: {product: 1}};
            } else if (subsystem === Subsystem.SYS && command === 'osalNvRead') {
                if (equalsPartial(payload, {id: NvItemsIds.ZNP_HAS_CONFIGURED_ZSTACK3, offset: 0})) {
                    return {payload: {value: Buffer.from([0x55])}};
                } else if (equalsPartial(payload, {id: NvItemsIds.CHANLIST, offset: 0})) {
                    return {payload: {value: Buffer.from([0,8,0,0])}};
                } else if (equalsPartial(payload, {id: NvItemsIds.PRECFGKEYS_ENABLE, offset: 0})) {
                    return {payload: {value: Buffer.from([0])}};
                } else if (equalsPartial(payload, {id: NvItemsIds.PRECFGKEY, offset: 0})) {
                    // This one is invalid
                    return {payload: {value: Buffer.from([1, 2])}};
                } else {
                    missing();
                }
            } else if (subsystem === Subsystem.UTIL && command === 'getDeviceInfo') {
                return {payload: {devicestate: Constants.COMMON.devStates.ZB_COORD}};
            } else if (subsystem === Subsystem.ZDO && command === 'activeEpReq') {
                return {};
            } else if (subsystem === Subsystem.AF && command === 'register') {
                return {};
            } else if (subsystem === Subsystem.SYS && command === 'resetReq') {
                return {};
            } else if (subsystem === Subsystem.SYS && command === 'osalNvWrite') {
                return {};
            } else if (subsystem === Subsystem.APP_CNF && command === 'bdbSetChannel') {
                return {};
            } else if (subsystem === Subsystem.APP_CNF && command === 'bdbStartCommissioning') {
                return {};
            } else if (subsystem === Subsystem.SYS && command === 'osalNvItemInit') {
                return {};
            } else {
                missing();
            }
        });

        mockZnpWaitfor.mockImplementation((type, subsystem, command, payload) => {
            const missing = () => {
                const msg = `Not implemented - ${Type[type]} - ${Subsystem[subsystem]} - ${command} - ${JSON.stringify(payload)}`;
                console.log(msg)
                throw new Error(msg);
            }

            if (type === Type.AREQ && subsystem === Subsystem.ZDO && command === 'activeEpRsp') {
                return {payload: {activeeplist: []}};
            } else if (type === Type.AREQ && subsystem === Subsystem.ZDO && command === 'stateChangeInd') {
                return {payload: {activeeplist: []}};
            } else {
                missing();
            }
        });

        const result = await adapter.start();
        expect(result).toBe('resetted');
        expect(Znp).toBeCalledWith("dummy", 800, false);
        expect(mockZnpOpen).toBeCalledTimes(1);
        expect(mockZnpRequest.mock.calls[0][1]).toBe('version');
        expect(mockZnpRequest.mock.calls[1][2].id).toBe(NvItemsIds.ZNP_HAS_CONFIGURED_ZSTACK3);
        expect(mockZnpRequest.mock.calls[2][2].id).toBe(NvItemsIds.ZNP_HAS_CONFIGURED_ZSTACK3);
        expect(mockZnpRequest.mock.calls[3][2].id).toBe(NvItemsIds.CHANLIST);
        expect(mockZnpRequest.mock.calls[4][2].id).toBe(NvItemsIds.PRECFGKEYS_ENABLE);
        expect(mockZnpRequest.mock.calls[5][1]).toBe('osalNvRead');
        expect(mockZnpRequest.mock.calls[5][2].id).toBe(NvItemsIds.PRECFGKEY);
        expect(mockZnpRequest.mock.calls[6][1]).toBe('resetReq');
        expect(mockZnpRequest.mock.calls[7][1]).toBe('osalNvWrite');
        expect(mockZnpRequest.mock.calls[7][2].value).toStrictEqual(Buffer.from([0x02]));
        expect(mockZnpRequest.mock.calls[8][1]).toBe('resetReq');
        expect(mockZnpRequest.mock.calls[9][1]).toBe('osalNvWrite');
        expect(mockZnpRequest.mock.calls[9][2].value).toStrictEqual(Buffer.from([0]));
        expect(mockZnpRequest.mock.calls[10][1]).toBe('osalNvWrite');
        expect(mockZnpRequest.mock.calls[10][2].value).toStrictEqual(Buffer.from([0]));
        expect(mockZnpRequest.mock.calls[11][1]).toBe('osalNvWrite');
        expect(mockZnpRequest.mock.calls[11][2].value).toStrictEqual(Buffer.from([1]));
        expect(mockZnpRequest.mock.calls[12][1]).toBe('osalNvWrite');
        expect(mockZnpRequest.mock.calls[12][2].value).toStrictEqual(Buffer.from([0, 8, 0, 0]));
        expect(mockZnpRequest.mock.calls[13][1]).toBe('osalNvWrite');
        expect(mockZnpRequest.mock.calls[13][2].value).toStrictEqual(Buffer.from([networkOptions.panID, 0]));
        expect(mockZnpRequest.mock.calls[14][1]).toBe('osalNvWrite');
        expect(mockZnpRequest.mock.calls[14][2].value).toStrictEqual(Buffer.from(networkOptions.extenedPanID));
        expect(mockZnpRequest.mock.calls[15][1]).toBe('osalNvWrite');
        expect(mockZnpRequest.mock.calls[15][2].value).toStrictEqual(Buffer.from(networkOptions.networkKey));
        expect(mockZnpRequest.mock.calls[16][1]).toBe('bdbSetChannel');
        expect(mockZnpRequest.mock.calls[16][2].channel).toStrictEqual(2048);
        expect(mockZnpRequest.mock.calls[17][1]).toBe('bdbSetChannel');
        expect(mockZnpRequest.mock.calls[17][2].channel).toStrictEqual(0);
        expect(mockZnpRequest.mock.calls[18][1]).toBe('bdbStartCommissioning');
        expect(mockZnpRequest.mock.calls[18][2].mode).toStrictEqual(4);
        expect(mockZnpWaitfor.mock.calls[0][2]).toBe('stateChangeInd');
        expect(mockZnpWaitfor.mock.calls[0][3].state).toStrictEqual(9);
        expect(mockZnpWaitfor.mock.calls[0][4]).toStrictEqual(60000);
        expect(mockZnpRequest.mock.calls[19][1]).toBe('bdbStartCommissioning');
        expect(mockZnpRequest.mock.calls[19][2].mode).toStrictEqual(2);
        expect(mockZnpRequest.mock.calls[20][1]).toBe('osalNvItemInit');
        expect(mockZnpRequest.mock.calls[20][2].id).toStrictEqual(NvItemsIds.ZNP_HAS_CONFIGURED_ZSTACK3);
        expect(mockZnpRequest.mock.calls[21][1]).toBe('osalNvWrite');
        expect(mockZnpRequest.mock.calls[21][2].value).toStrictEqual(Buffer.from([0x55]));
        expect(mockZnpRequest.mock.calls[22][1]).toBe('getDeviceInfo');
        expect(mockZnpRequest.mock.calls[23][1]).toBe('activeEpReq');
        expect(mockZnpRequest.mock.calls[24][1]).toBe('register');
        expect(mockZnpRequest.mock.calls[24][2].endpoint).toBe(1);
        expect(mockZnpRequest.mock.calls[24][2].appprofid).toBe(0x0104);
        expect(mockZnpRequest.mock.calls[25][1]).toBe('register');
        expect(mockZnpRequest.mock.calls[25][2].endpoint).toBe(2);
        expect(mockZnpRequest.mock.calls[25][2].appprofid).toBe(0x0101);
        expect(mockZnpRequest.mock.calls[26][1]).toBe('register');
        expect(mockZnpRequest.mock.calls[26][2].endpoint).toBe(3);
        expect(mockZnpRequest.mock.calls[26][2].appprofid).toBe(0x0105);
        expect(mockZnpRequest.mock.calls[27][1]).toBe('register');
        expect(mockZnpRequest.mock.calls[27][2].endpoint).toBe(4);
        expect(mockZnpRequest.mock.calls[27][2].appprofid).toBe(0x0107);
        expect(mockZnpRequest.mock.calls[28][1]).toBe('register');
        expect(mockZnpRequest.mock.calls[28][2].endpoint).toBe(5);
        expect(mockZnpRequest.mock.calls[28][2].appprofid).toBe(0x0108);
        expect(mockZnpRequest.mock.calls[29][1]).toBe('register');
        expect(mockZnpRequest.mock.calls[29][2].endpoint).toBe(6);
        expect(mockZnpRequest.mock.calls[29][2].appprofid).toBe(0x0109);
        expect(mockZnpRequest.mock.calls[30][1]).toBe('register');
        expect(mockZnpRequest.mock.calls[30][2].endpoint).toBe(11);
        expect(mockZnpRequest.mock.calls[30][2].appprofid).toBe(0x0104);
        expect(mockZnpRequest.mock.calls[30][2].appoutclusterlist).toStrictEqual([1280]);
        expect(mockZnpRequest).toHaveBeenCalledTimes(31);
    });

    it('Start zStack 1.2 initialize', async () => {
        networkOptions.networkKeyDistribute = true;
        adapter = new ZStackAdapter(networkOptions, serialPortOptions, 'backup.json');
        mockZnpRequest.mockImplementation(async (subsystem, command, payload, expectedStatus) => {
            const missing = () => {
                const msg = `Not implemented - ${Subsystem[subsystem]} - ${command} - ${JSON.stringify(payload)}`;
                console.log(msg)
                throw new Error(msg);
            }

            if (subsystem === Subsystem.SYS && command === 'version' && equals(payload, {})) {
                return {payload: {product: 0}};
            } else if (subsystem === Subsystem.SYS && command === 'osalNvRead') {
                if (equalsPartial(payload, {id: NvItemsIds.ZNP_HAS_CONFIGURED_ZSTACK1, offset: 0})) {
                    return {payload: {value: Buffer.from([0x55])}};
                } else if (equalsPartial(payload, {id: NvItemsIds.CHANLIST, offset: 0})) {
                    return {payload: {value: Buffer.from([0,8,0,0])}};
                } else if (equalsPartial(payload, {id: NvItemsIds.PRECFGKEYS_ENABLE, offset: 0})) {
                    return {payload: {value: Buffer.from([1])}};
                } else if (equalsPartial(payload, {id: NvItemsIds.PANID, offset: 0})) {
                    return {payload: {value: Buffer.from([networkOptions.panID, 0])}};
                } else if (equalsPartial(payload, {id: NvItemsIds.EXTENDED_PAN_ID, offset: 0})) {
                    // Mismatch
                    return {payload: {value: Buffer.from([1])}};
                } else {
                    missing();
                }
            } else if (subsystem === Subsystem.UTIL && command === 'getDeviceInfo') {
                return {payload: {devicestate: Constants.COMMON.devStates.ZB_COORD}};
            } else if (subsystem === Subsystem.ZDO && command === 'activeEpReq') {
                return {};
            } else if (subsystem === Subsystem.AF && command === 'register') {
                return {};
            } else if (subsystem === Subsystem.SYS && command === 'resetReq') {
                return {};
            } else if (subsystem === Subsystem.SYS && command === 'osalNvWrite') {
                return {};
            } else if (subsystem === Subsystem.SYS && command === 'osalNvItemInit') {
                return {};
            } else if (subsystem === Subsystem.SAPI && command === 'readConfiguration') {
                return {payload: {value: Buffer.from(networkOptions.networkKey)}};
            } else if (subsystem === Subsystem.SAPI && command === 'writeConfiguration') {
                return {};
            } else {
                missing();
            }
        });

        mockZnpWaitfor.mockImplementation((type, subsystem, command, payload) => {
            const missing = () => {
                const msg = `Not implemented - ${Type[type]} - ${Subsystem[subsystem]} - ${command} - ${JSON.stringify(payload)}`;
                console.log(msg)
                throw new Error(msg);
            }

            if (type === Type.AREQ && subsystem === Subsystem.ZDO && command === 'activeEpRsp') {
                return {payload: {activeeplist: []}};
            } else if (type === Type.AREQ && subsystem === Subsystem.ZDO && command === 'stateChangeInd') {
                return {payload: {activeeplist: []}};
            } else {
                missing();
            }
        });

        const result = await adapter.start();
        expect(result).toBe('resetted');
        expect(Znp).toBeCalledWith("dummy", 800, false);
        expect(mockZnpOpen).toBeCalledTimes(1);
        expect(mockZnpRequest.mock.calls[0][1]).toBe('version');
        expect(mockZnpRequest.mock.calls[1][2].id).toBe(NvItemsIds.ZNP_HAS_CONFIGURED_ZSTACK1);
        expect(mockZnpRequest.mock.calls[2][2].id).toBe(NvItemsIds.ZNP_HAS_CONFIGURED_ZSTACK1);
        expect(mockZnpRequest.mock.calls[3][2].id).toBe(NvItemsIds.CHANLIST);
        expect(mockZnpRequest.mock.calls[4][2].id).toBe(NvItemsIds.PRECFGKEYS_ENABLE);
        expect(mockZnpRequest.mock.calls[5][1]).toBe('readConfiguration');
        expect(mockZnpRequest.mock.calls[5][2].id).toBe(NvItemsIds.PRECFGKEY);
        expect(mockZnpRequest.mock.calls[6][2].id).toBe(NvItemsIds.PANID);
        expect(mockZnpRequest.mock.calls[7][2].id).toBe(NvItemsIds.EXTENDED_PAN_ID);

        expect(mockZnpRequest.mock.calls[8][1]).toBe('resetReq');
        expect(mockZnpRequest.mock.calls[9][1]).toBe('osalNvWrite');
        expect(mockZnpRequest.mock.calls[9][2].value).toStrictEqual(Buffer.from([0x02]));
        expect(mockZnpRequest.mock.calls[10][1]).toBe('resetReq');
        expect(mockZnpRequest.mock.calls[11][1]).toBe('osalNvWrite');
        expect(mockZnpRequest.mock.calls[11][2].value).toStrictEqual(Buffer.from([0]));
        expect(mockZnpRequest.mock.calls[12][1]).toBe('osalNvWrite');
        expect(mockZnpRequest.mock.calls[12][2].value).toStrictEqual(Buffer.from([1]));
        expect(mockZnpRequest.mock.calls[13][1]).toBe('osalNvWrite');
        expect(mockZnpRequest.mock.calls[13][2].value).toStrictEqual(Buffer.from([1]));
        expect(mockZnpRequest.mock.calls[14][1]).toBe('osalNvWrite');
        expect(mockZnpRequest.mock.calls[14][2].value).toStrictEqual(Buffer.from([0, 8, 0, 0]));
        expect(mockZnpRequest.mock.calls[15][1]).toBe('osalNvWrite');
        expect(mockZnpRequest.mock.calls[15][2].value).toStrictEqual(Buffer.from([networkOptions.panID, 0]));
        expect(mockZnpRequest.mock.calls[16][1]).toBe('osalNvWrite');
        expect(mockZnpRequest.mock.calls[16][2].value).toStrictEqual(Buffer.from(networkOptions.extenedPanID));
        expect(mockZnpRequest.mock.calls[17][1]).toBe('writeConfiguration');
        expect(mockZnpRequest.mock.calls[17][2].value).toStrictEqual(Buffer.from(networkOptions.networkKey));
        expect(mockZnpRequest.mock.calls[18][1]).toBe('osalNvWrite');
        expect(mockZnpRequest.mock.calls[18][2].value).toStrictEqual(Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x5a, 0x69, 0x67, 0x42, 0x65, 0x65, 0x41, 0x6c, 0x6c, 0x69, 0x61, 0x6e, 0x63, 0x65, 0x30, 0x39, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]));
        expect(mockZnpRequest.mock.calls[19][1]).toBe('osalNvItemInit');
        expect(mockZnpRequest.mock.calls[19][2].id).toStrictEqual(NvItemsIds.ZNP_HAS_CONFIGURED_ZSTACK1);
        expect(mockZnpRequest.mock.calls[20][1]).toBe('osalNvWrite');
        expect(mockZnpRequest.mock.calls[20][2].value).toStrictEqual(Buffer.from([0x55]));
    });

    it('Start zStack 3.0.x initialize', async () => {
        mockZnpRequest.mockImplementation((subsystem, command, payload, expectedStatus) => {
            const missing = () => {
                const msg = `Not implemented - ${Subsystem[subsystem]} - ${command} - ${JSON.stringify(payload)}`;
                console.log(msg)
                throw new Error(msg);
            }

            if (subsystem === Subsystem.SYS && command === 'version' && equals(payload, {})) {
                return {payload: {product: 2}};
            } else if (subsystem === Subsystem.SYS && command === 'osalNvRead') {
                if (equalsPartial(payload, {id: NvItemsIds.ZNP_HAS_CONFIGURED_ZSTACK3, offset: 0})) {
                    return {payload: {value: Buffer.from([0x55])}};
                } else if (equalsPartial(payload, {id: NvItemsIds.CHANLIST, offset: 0})) {
                    return {payload: {value: Buffer.from([0,8,0,0])}};
                } else if (equalsPartial(payload, {id: NvItemsIds.PRECFGKEYS_ENABLE, offset: 0})) {
                    return {payload: {value: Buffer.from([0])}};
                } else {
                    missing();
                }
            } else if (subsystem === Subsystem.UTIL && command === 'getDeviceInfo') {
                return {payload: {devicestate: Constants.COMMON.devStates.ZB_COORD}};
            } else if (subsystem === Subsystem.ZDO && command === 'activeEpReq') {
                return {};
            } else if (subsystem === Subsystem.AF && command === 'register') {
                return {};
            } else if (subsystem === Subsystem.SYS && command === 'resetReq') {
                return {};
            } else if (subsystem === Subsystem.SYS && command === 'osalNvWrite') {
                return {};
            } else if (subsystem === Subsystem.APP_CNF && command === 'bdbSetChannel') {
                return {};
            } else if (subsystem === Subsystem.APP_CNF && command === 'bdbStartCommissioning') {
                return {};
            } else if (subsystem === Subsystem.SYS && command === 'osalNvItemInit') {
                return {};
            } else if (subsystem === Subsystem.SAPI && command === 'readConfiguration') {
                // This one is invalid
                return {payload: {value: Buffer.from([1])}};
            } else {
                missing();
            }
        });

        mockZnpWaitfor.mockImplementation((type, subsystem, command, payload) => {
            const missing = () => {
                const msg = `Not implemented - ${Type[type]} - ${Subsystem[subsystem]} - ${command} - ${JSON.stringify(payload)}`;
                console.log(msg)
                throw new Error(msg);
            }

            if (type === Type.AREQ && subsystem === Subsystem.ZDO && command === 'activeEpRsp') {
                return {payload: {activeeplist: []}};
            } else if (type === Type.AREQ && subsystem === Subsystem.ZDO && command === 'stateChangeInd') {
                return {payload: {activeeplist: []}};
            } else {
                missing();
            }
        });

        const result = await adapter.start();
        expect(result).toBe('resetted');
        expect(Znp).toBeCalledWith("dummy", 800, false);
        expect(mockZnpOpen).toBeCalledTimes(1);
        expect(mockZnpRequest.mock.calls[0][1]).toBe('version');
        expect(mockZnpRequest.mock.calls[1][2].id).toBe(NvItemsIds.ZNP_HAS_CONFIGURED_ZSTACK3);
        expect(mockZnpRequest.mock.calls[2][2].id).toBe(NvItemsIds.ZNP_HAS_CONFIGURED_ZSTACK3);
        expect(mockZnpRequest.mock.calls[3][2].id).toBe(NvItemsIds.CHANLIST);
        expect(mockZnpRequest.mock.calls[4][2].id).toBe(NvItemsIds.PRECFGKEYS_ENABLE);
        expect(mockZnpRequest.mock.calls[5][1]).toBe('readConfiguration');
        expect(mockZnpRequest.mock.calls[5][2].id).toBe(NvItemsIds.PRECFGKEY);
        expect(mockZnpRequest.mock.calls[6][1]).toBe('resetReq');
        expect(mockZnpRequest.mock.calls[7][1]).toBe('osalNvWrite');
        expect(mockZnpRequest.mock.calls[7][2].value).toStrictEqual(Buffer.from([0x02]));
        expect(mockZnpRequest.mock.calls[8][1]).toBe('resetReq');
        expect(mockZnpRequest.mock.calls[9][1]).toBe('osalNvWrite');
        expect(mockZnpRequest.mock.calls[9][2].value).toStrictEqual(Buffer.from([0]));
        expect(mockZnpRequest.mock.calls[10][1]).toBe('osalNvWrite');
        expect(mockZnpRequest.mock.calls[10][2].value).toStrictEqual(Buffer.from([0]));
        expect(mockZnpRequest.mock.calls[11][1]).toBe('osalNvWrite');
        expect(mockZnpRequest.mock.calls[11][2].value).toStrictEqual(Buffer.from([1]));
        expect(mockZnpRequest.mock.calls[12][1]).toBe('osalNvWrite');
        expect(mockZnpRequest.mock.calls[12][2].value).toStrictEqual(Buffer.from([0, 8, 0, 0]));
        expect(mockZnpRequest.mock.calls[13][1]).toBe('osalNvWrite');
        expect(mockZnpRequest.mock.calls[13][2].value).toStrictEqual(Buffer.from([networkOptions.panID, 0]));
        expect(mockZnpRequest.mock.calls[14][1]).toBe('osalNvWrite');
        expect(mockZnpRequest.mock.calls[14][2].value).toStrictEqual(Buffer.from(networkOptions.extenedPanID));
        expect(mockZnpRequest.mock.calls[15][1]).toBe('osalNvWrite');
        expect(mockZnpRequest.mock.calls[15][2].value).toStrictEqual(Buffer.from(networkOptions.networkKey));
        expect(mockZnpRequest.mock.calls[16][1]).toBe('bdbSetChannel');
        expect(mockZnpRequest.mock.calls[16][2].channel).toStrictEqual(2048);
        expect(mockZnpRequest.mock.calls[17][1]).toBe('bdbSetChannel');
        expect(mockZnpRequest.mock.calls[17][2].channel).toStrictEqual(0);
        expect(mockZnpRequest.mock.calls[18][1]).toBe('bdbStartCommissioning');
        expect(mockZnpRequest.mock.calls[18][2].mode).toStrictEqual(4);
        expect(mockZnpWaitfor.mock.calls[0][2]).toBe('stateChangeInd');
        expect(mockZnpWaitfor.mock.calls[0][3].state).toStrictEqual(9);
        expect(mockZnpWaitfor.mock.calls[0][4]).toStrictEqual(60000);
        expect(mockZnpRequest.mock.calls[19][1]).toBe('bdbStartCommissioning');
        expect(mockZnpRequest.mock.calls[19][2].mode).toStrictEqual(2);
        expect(mockZnpRequest.mock.calls[20][1]).toBe('osalNvItemInit');
        expect(mockZnpRequest.mock.calls[20][2].id).toStrictEqual(NvItemsIds.ZNP_HAS_CONFIGURED_ZSTACK3);
        expect(mockZnpRequest.mock.calls[21][1]).toBe('osalNvWrite');
        expect(mockZnpRequest.mock.calls[21][2].value).toStrictEqual(Buffer.from([0x55]));
        expect(mockZnpRequest.mock.calls[22][1]).toBe('getDeviceInfo');
        expect(mockZnpRequest.mock.calls[23][1]).toBe('activeEpReq');
        expect(mockZnpRequest.mock.calls[24][1]).toBe('register');
        expect(mockZnpRequest.mock.calls[24][2].endpoint).toBe(1);
        expect(mockZnpRequest.mock.calls[24][2].appprofid).toBe(0x0104);
        expect(mockZnpRequest.mock.calls[25][1]).toBe('register');
        expect(mockZnpRequest.mock.calls[25][2].endpoint).toBe(2);
        expect(mockZnpRequest.mock.calls[25][2].appprofid).toBe(0x0101);
        expect(mockZnpRequest.mock.calls[26][1]).toBe('register');
        expect(mockZnpRequest.mock.calls[26][2].endpoint).toBe(3);
        expect(mockZnpRequest.mock.calls[26][2].appprofid).toBe(0x0105);
        expect(mockZnpRequest.mock.calls[27][1]).toBe('register');
        expect(mockZnpRequest.mock.calls[27][2].endpoint).toBe(4);
        expect(mockZnpRequest.mock.calls[27][2].appprofid).toBe(0x0107);
        expect(mockZnpRequest.mock.calls[28][1]).toBe('register');
        expect(mockZnpRequest.mock.calls[28][2].endpoint).toBe(5);
        expect(mockZnpRequest.mock.calls[28][2].appprofid).toBe(0x0108);
        expect(mockZnpRequest.mock.calls[29][1]).toBe('register');
        expect(mockZnpRequest.mock.calls[29][2].endpoint).toBe(6);
        expect(mockZnpRequest.mock.calls[29][2].appprofid).toBe(0x0109);
        expect(mockZnpRequest.mock.calls[30][1]).toBe('register');
        expect(mockZnpRequest.mock.calls[30][2].endpoint).toBe(11);
        expect(mockZnpRequest.mock.calls[30][2].appprofid).toBe(0x0104);
        expect(mockZnpRequest.mock.calls[30][2].appoutclusterlist).toStrictEqual([1280]);
        expect(mockZnpRequest).toHaveBeenCalledTimes(31);
    });

    it('Start zStack 3.x.0 resume', async () => {
        mockZnpRequest.mockImplementation((subsystem, command, payload, expectedStatus) => {
            const missing = () => {
                const msg = `Not implemented - ${Subsystem[subsystem]} - ${command} - ${JSON.stringify(payload)}`;
                console.log(msg)
                throw new Error(msg);
            }

            if (subsystem === Subsystem.SYS && command === 'version' && equals(payload, {})) {
                return {payload: {product: 1}};
            } else if (subsystem === Subsystem.SYS && command === 'osalNvRead') {
                if (equalsPartial(payload, {id: NvItemsIds.ZNP_HAS_CONFIGURED_ZSTACK3, offset: 0})) {
                    return {payload: {value: Buffer.from([0x55])}};
                } else if (equalsPartial(payload, {id: NvItemsIds.CHANLIST, offset: 0})) {
                    return {payload: {value: Buffer.from([0,8,0,0])}};
                } else if (equalsPartial(payload, {id: NvItemsIds.PRECFGKEYS_ENABLE, offset: 0})) {
                    return {payload: {value: Buffer.from([0])}};
                } else if (equalsPartial(payload, {id: NvItemsIds.PRECFGKEY, offset: 0})) {
                    return {payload: {value: Buffer.from(networkOptions.networkKey)}};
                } else if (equalsPartial(payload, {id: NvItemsIds.PANID, offset: 0})) {
                    return {payload: {value: Buffer.from([networkOptions.panID, 0])}};
                } else if (equalsPartial(payload, {id: NvItemsIds.EXTENDED_PAN_ID, offset: 0})) {
                    return {payload: {value: Buffer.from(networkOptions.extenedPanID)}};
                } else {
                    missing();
                }
            } else if (subsystem === Subsystem.UTIL && command === 'getDeviceInfo') {
                return {payload: {devicestate: -1}};
            } else if (subsystem === Subsystem.ZDO && command === 'activeEpReq') {
                return {};
            } else if (subsystem === Subsystem.AF && command === 'register') {
                return {};
            } else if (subsystem === Subsystem.SYS && command === 'resetReq') {
                return {};
            } else if (subsystem === Subsystem.SYS && command === 'osalNvWrite') {
                return {};
            } else if (subsystem === Subsystem.APP_CNF && command === 'bdbSetChannel') {
                return {};
            } else if (subsystem === Subsystem.APP_CNF && command === 'bdbStartCommissioning') {
                return {};
            } else if (subsystem === Subsystem.SYS && command === 'osalNvItemInit') {
                return {};
            } else if (subsystem === Subsystem.ZDO && command === 'startupFromApp') {
                return {};
            } else {
                missing();
            }
        });

        mockZnpWaitfor.mockImplementation((type, subsystem, command, payload) => {
            const missing = () => {
                const msg = `Not implemented - ${Type[type]} - ${Subsystem[subsystem]} - ${command} - ${JSON.stringify(payload)}`;
                console.log(msg)
                throw new Error(msg);
            }

            if (type === Type.AREQ && subsystem === Subsystem.ZDO && command === 'activeEpRsp') {
                return {payload: {activeeplist: [1, 2, 3, 4, 5, 6]}};
            } else if (type === Type.AREQ && subsystem === Subsystem.ZDO && command === 'stateChangeInd') {
                return {payload: {activeeplist: []}};
            } else {
                missing();
            }
        });

        const result = await adapter.start();
        expect(result).toBe('resumed');
        expect(Znp).toBeCalledWith("dummy", 800, false);
        expect(mockZnpOpen).toBeCalledTimes(1);
        expect(mockZnpRequest.mock.calls[0][1]).toBe('version');
        expect(mockZnpRequest.mock.calls[1][2].id).toBe(NvItemsIds.ZNP_HAS_CONFIGURED_ZSTACK3);
        expect(mockZnpRequest.mock.calls[2][2].id).toBe(NvItemsIds.ZNP_HAS_CONFIGURED_ZSTACK3);
        expect(mockZnpRequest.mock.calls[3][2].id).toBe(NvItemsIds.CHANLIST);
        expect(mockZnpRequest.mock.calls[4][2].id).toBe(NvItemsIds.PRECFGKEYS_ENABLE);
        expect(mockZnpRequest.mock.calls[5][1]).toBe('osalNvRead');
        expect(mockZnpRequest.mock.calls[5][2].id).toBe(NvItemsIds.PRECFGKEY);
        expect(mockZnpRequest.mock.calls[6][1]).toBe('osalNvRead');
        expect(mockZnpRequest.mock.calls[6][2].id).toBe(NvItemsIds.PANID);
        expect(mockZnpRequest.mock.calls[7][1]).toBe('osalNvRead');
        expect(mockZnpRequest.mock.calls[7][2].id).toBe(NvItemsIds.EXTENDED_PAN_ID);
        expect(mockZnpRequest.mock.calls[8][1]).toBe('getDeviceInfo');
        expect(mockZnpWaitfor.mock.calls[0][2]).toBe('stateChangeInd');
        expect(mockZnpWaitfor.mock.calls[0][3].state).toStrictEqual(9);
        expect(mockZnpWaitfor.mock.calls[0][4]).toStrictEqual(60000);
        expect(mockZnpRequest.mock.calls[9][1]).toBe('startupFromApp');
        expect(mockZnpWaitfor.mock.calls[1][2]).toBe('activeEpRsp');
        expect(mockZnpRequest.mock.calls[10][1]).toBe('activeEpReq');
        expect(mockZnpRequest.mock.calls[11][2].endpoint).toBe(11);
        expect(mockZnpRequest.mock.calls[11][2].appprofid).toBe(0x0104);
        expect(mockZnpRequest.mock.calls[11][2].appoutclusterlist).toStrictEqual([1280]);
        expect(mockZnpRequest).toHaveBeenCalledTimes(12);
        expect(mockZnpWaitfor).toHaveBeenCalledTimes(2);
    });

    it('Start zStack 3.x.0 resume when panID doesnt match and is 0xFF 0xFF', async () => {
        mockZnpRequest.mockImplementation((subsystem, command, payload, expectedStatus) => {
            const missing = () => {
                const msg = `Not implemented - ${Subsystem[subsystem]} - ${command} - ${JSON.stringify(payload)}`;
                console.log(msg)
                throw new Error(msg);
            }

            if (subsystem === Subsystem.SYS && command === 'version' && equals(payload, {})) {
                return {payload: {product: 1}};
            } else if (subsystem === Subsystem.SYS && command === 'osalNvRead') {
                if (equalsPartial(payload, {id: NvItemsIds.ZNP_HAS_CONFIGURED_ZSTACK3, offset: 0})) {
                    return {payload: {value: Buffer.from([0x55])}};
                } else if (equalsPartial(payload, {id: NvItemsIds.CHANLIST, offset: 0})) {
                    return {payload: {value: Buffer.from([0,8,0,0])}};
                } else if (equalsPartial(payload, {id: NvItemsIds.PRECFGKEYS_ENABLE, offset: 0})) {
                    return {payload: {value: Buffer.from([0])}};
                } else if (equalsPartial(payload, {id: NvItemsIds.PRECFGKEY, offset: 0})) {
                    return {payload: {value: Buffer.from(networkOptions.networkKey)}};
                } else if (equalsPartial(payload, {id: NvItemsIds.PANID, offset: 0})) {
                    return {payload: {value: Buffer.from([0xFF, 0xFF])}};
                } else if (equalsPartial(payload, {id: NvItemsIds.EXTENDED_PAN_ID, offset: 0})) {
                    return {payload: {value: Buffer.from(networkOptions.extenedPanID)}};
                } else {
                    missing();
                }
            } else if (subsystem === Subsystem.UTIL && command === 'getDeviceInfo') {
                return {payload: {devicestate: -1}};
            } else if (subsystem === Subsystem.ZDO && command === 'activeEpReq') {
                return {};
            } else if (subsystem === Subsystem.AF && command === 'register') {
                return {};
            } else if (subsystem === Subsystem.SYS && command === 'resetReq') {
                return {};
            } else if (subsystem === Subsystem.SYS && command === 'osalNvWrite') {
                return {};
            } else if (subsystem === Subsystem.APP_CNF && command === 'bdbSetChannel') {
                return {};
            } else if (subsystem === Subsystem.APP_CNF && command === 'bdbStartCommissioning') {
                return {};
            } else if (subsystem === Subsystem.SYS && command === 'osalNvItemInit') {
                return {};
            } else if (subsystem === Subsystem.ZDO && command === 'startupFromApp') {
                return {};
            } else {
                missing();
            }
        });

        mockZnpWaitfor.mockImplementation((type, subsystem, command, payload) => {
            const missing = () => {
                const msg = `Not implemented - ${Type[type]} - ${Subsystem[subsystem]} - ${command} - ${JSON.stringify(payload)}`;
                console.log(msg)
                throw new Error(msg);
            }

            if (type === Type.AREQ && subsystem === Subsystem.ZDO && command === 'activeEpRsp') {
                return {payload: {activeeplist: [1, 2, 3, 4, 5, 6]}};
            } else if (type === Type.AREQ && subsystem === Subsystem.ZDO && command === 'stateChangeInd') {
                return {payload: {activeeplist: []}};
            } else {
                missing();
            }
        });

        const result = await adapter.start();
        expect(result).toBe('resumed');
        expect(Znp).toBeCalledWith("dummy", 800, false);
        expect(mockZnpOpen).toBeCalledTimes(1);
        expect(mockZnpRequest.mock.calls[0][1]).toBe('version');
        expect(mockZnpRequest.mock.calls[1][2].id).toBe(NvItemsIds.ZNP_HAS_CONFIGURED_ZSTACK3);
        expect(mockZnpRequest.mock.calls[2][2].id).toBe(NvItemsIds.ZNP_HAS_CONFIGURED_ZSTACK3);
        expect(mockZnpRequest.mock.calls[3][2].id).toBe(NvItemsIds.CHANLIST);
        expect(mockZnpRequest.mock.calls[4][2].id).toBe(NvItemsIds.PRECFGKEYS_ENABLE);
        expect(mockZnpRequest.mock.calls[5][1]).toBe('osalNvRead');
        expect(mockZnpRequest.mock.calls[5][2].id).toBe(NvItemsIds.PRECFGKEY);
        expect(mockZnpRequest.mock.calls[6][1]).toBe('osalNvRead');
        expect(mockZnpRequest.mock.calls[6][2].id).toBe(NvItemsIds.PANID);
        expect(mockZnpRequest.mock.calls[7][1]).toBe('osalNvRead');
        expect(mockZnpRequest.mock.calls[7][2].id).toBe(NvItemsIds.PANID);
        expect(mockZnpRequest.mock.calls[8][1]).toBe('getDeviceInfo');
        expect(mockZnpWaitfor.mock.calls[0][2]).toBe('stateChangeInd');
        expect(mockZnpWaitfor.mock.calls[0][3].state).toStrictEqual(9);
        expect(mockZnpWaitfor.mock.calls[0][4]).toStrictEqual(60000);
        expect(mockZnpRequest.mock.calls[9][1]).toBe('startupFromApp');
        expect(mockZnpWaitfor.mock.calls[1][2]).toBe('activeEpRsp');
        expect(mockZnpRequest.mock.calls[10][1]).toBe('activeEpReq');
        expect(mockZnpRequest.mock.calls[11][2].endpoint).toBe(11);
        expect(mockZnpRequest.mock.calls[11][2].appprofid).toBe(0x0104);
        expect(mockZnpRequest.mock.calls[11][2].appoutclusterlist).toStrictEqual([1280]);
        expect(mockZnpRequest).toHaveBeenCalledTimes(12);
        expect(mockZnpWaitfor).toHaveBeenCalledTimes(2);
    });

    it('Start zStack 3.x.0 reset when panID doesnt match and is NOT 0xFF 0xFF', async () => {
        mockZnpRequest.mockImplementation((subsystem, command, payload, expectedStatus) => {
            const missing = () => {
                const msg = `Not implemented - ${Subsystem[subsystem]} - ${command} - ${JSON.stringify(payload)}`;
                console.log(msg)
                throw new Error(msg);
            }

            if (subsystem === Subsystem.SYS && command === 'version' && equals(payload, {})) {
                return {payload: {product: 1}};
            } else if (subsystem === Subsystem.SYS && command === 'osalNvRead') {
                if (equalsPartial(payload, {id: NvItemsIds.ZNP_HAS_CONFIGURED_ZSTACK3, offset: 0})) {
                    return {payload: {value: Buffer.from([0x55])}};
                } else if (equalsPartial(payload, {id: NvItemsIds.CHANLIST, offset: 0})) {
                    return {payload: {value: Buffer.from([0,8,0,0])}};
                } else if (equalsPartial(payload, {id: NvItemsIds.PRECFGKEYS_ENABLE, offset: 0})) {
                    return {payload: {value: Buffer.from([0])}};
                } else if (equalsPartial(payload, {id: NvItemsIds.PRECFGKEY, offset: 0})) {
                    return {payload: {value: Buffer.from(networkOptions.networkKey)}};
                } else if (equalsPartial(payload, {id: NvItemsIds.PANID, offset: 0})) {
                    return {payload: {value: Buffer.from([0xFF, 0xAA])}};
                } else if (equalsPartial(payload, {id: NvItemsIds.EXTENDED_PAN_ID, offset: 0})) {
                    return {payload: {value: Buffer.from(networkOptions.extenedPanID)}};
                } else {
                    missing();
                }
            } else if (subsystem === Subsystem.UTIL && command === 'getDeviceInfo') {
                return {payload: {devicestate: -1}};
            } else if (subsystem === Subsystem.ZDO && command === 'activeEpReq') {
                return {};
            } else if (subsystem === Subsystem.AF && command === 'register') {
                return {};
            } else if (subsystem === Subsystem.SYS && command === 'resetReq') {
                return {};
            } else if (subsystem === Subsystem.SYS && command === 'osalNvWrite') {
                return {};
            } else if (subsystem === Subsystem.APP_CNF && command === 'bdbSetChannel') {
                return {};
            } else if (subsystem === Subsystem.APP_CNF && command === 'bdbStartCommissioning') {
                return {};
            } else if (subsystem === Subsystem.SYS && command === 'osalNvItemInit') {
                return {};
            } else if (subsystem === Subsystem.ZDO && command === 'startupFromApp') {
                return {};
            } else {
                missing();
            }
        });

        mockZnpWaitfor.mockImplementation((type, subsystem, command, payload) => {
            const missing = () => {
                const msg = `Not implemented - ${Type[type]} - ${Subsystem[subsystem]} - ${command} - ${JSON.stringify(payload)}`;
                console.log(msg)
                throw new Error(msg);
            }

            if (type === Type.AREQ && subsystem === Subsystem.ZDO && command === 'activeEpRsp') {
                return {payload: {activeeplist: [1, 2, 3, 4, 5, 6]}};
            } else if (type === Type.AREQ && subsystem === Subsystem.ZDO && command === 'stateChangeInd') {
                return {payload: {activeeplist: []}};
            } else {
                missing();
            }
        });

        const result = await adapter.start();
        expect(result).toBe('resetted');
    });

    it('Start restore from backup', async () => {
        mockZnpRequest.mockImplementation((subsystem, command, payload, expectedStatus) => {
            const missing = () => {
                const msg = `Not implemented - ${Subsystem[subsystem]} - ${command} - ${JSON.stringify(payload)}`;
                console.log(msg)
                throw new Error(msg);
            }

            if (subsystem === Subsystem.SYS && command === 'version' && equals(payload, {})) {
                return {payload: {product: 1}};
            } else if (subsystem === Subsystem.SYS && command === 'osalNvRead') {
                if (equalsPartial(payload, {id: NvItemsIds.ZNP_HAS_CONFIGURED_ZSTACK3, offset: 0})) {
                    return {payload: {value: Buffer.from([0])}};
                } else {
                    missing();
                }
            } else if (subsystem === Subsystem.SYS && command === 'osalNvItemInit') {
                return {};
            } else if (subsystem === Subsystem.SYS && command === 'osalNvWrite') {
                return {};
            } else if (subsystem === Subsystem.SYS && command === 'resetReq') {
                return {};
            } else if (subsystem === Subsystem.UTIL && command === 'getDeviceInfo') {
                return {payload: {devicestate: Constants.COMMON.devStates.ZB_COORD}};
            } else if (subsystem === Subsystem.ZDO && command === 'activeEpReq') {
                return {};
            } else if (subsystem === Subsystem.ZDO && command === 'startupFromApp') {
                return {};
            } else {
                missing();
            }
        });

        mockZnpWaitfor.mockImplementation((type, subsystem, command, payload) => {
            const missing = () => {
                const msg = `Not implemented - ${Type[type]} - ${Subsystem[subsystem]} - ${command} - ${JSON.stringify(payload)}`;
                console.log(msg)
                throw new Error(msg);
            }

            if (type === Type.AREQ && subsystem === Subsystem.ZDO && command === 'activeEpRsp') {
                return {payload: {activeeplist: [1, 2, 3, 4, 5, 6, 11]}};
            } else if (type === Type.AREQ && subsystem === Subsystem.ZDO && command === 'stateChangeInd') {
                return {payload: {activeeplist: []}};
            } else {
                missing();
            }
        });

        const backup = {"adapterType":"zStack","time":"Mon, 19 Aug 2019 16:21:55 GMT","meta":{"product":1},"data":{"ZCD_NV_PANID":{"id": 131,"offset": 0,"value": [123,0],"len": 2},"ZCD_NV_EXTADDR":{"id":1,"offset":0,"value":[174,68,1,18,0,75,18,0],"len":8},"ZCD_NV_NIB":{"id":33,"offset":0,"value":[230,5,2,16,20,16,0,20,0,0,0,1,5,1,143,7,0,2,5,30,0,0,14,0,0,0,0,0,0,0,0,0,0,114,60,8,0,64,0,0,15,15,4,0,1,0,0,0,1,0,0,0,0,174,68,1,18,0,75,18,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,60,3,0,1,120,10,1,0,0,65,0,0],"len":110},"ZCD_NV_EXTENDED_PAN_ID":{"id":45,"offset":0,"value":networkOptions.extenedPanID,"len":networkOptions.extenedPanID.length},"ZCD_NV_NWK_ACTIVE_KEY_INFO":{"id":58,"offset":0,"value":[0,1,3,5,7,9,11,13,15,0,2,4,6,8,10,12,13],"len":17},"ZCD_NV_NWK_ALTERN_KEY_INFO":{"id":59,"offset":0,"value":[0,1,3,5,7,9,11,13,15,0,2,4,6,8,10,12,13],"len":17},"ZCD_NV_APS_USE_EXT_PANID":{"id":71,"offset":0,"value":[0,0,0,0,0,0,0,0],"len":8},"ZCD_NV_PRECFGKEY":{"id":98,"offset":0,"value":[1,3,5,7,9,11,13,15,0,2,4,6,8,10,12,13],"len":16},"ZCD_NV_PRECFGKEY_ENABLE":{"id":99,"offset":0,"value":[0],"len":1},"ZCD_NV_TCLK_TABLE_START":{"id":257,"offset":0,"value":[94,15,57,228,82,11,124,39,162,90,56,187,81,51,252,149],"len":16},"ZCD_NV_CHANLIST":{"id":132,"offset":0,"value":[0,8,0,0],"len":4},"ZCD_NV_NWK_SEC_MATERIAL_TABLE_START":{"id":117,"offset":0,"value":[123,63,0,0,174,68,1,18,0,75,18,0],"len":12}}};
        const backupFile = tmp.fileSync();
        fs.writeFileSync(backupFile.name, JSON.stringify(backup), 'utf8');

        adapter = new ZStackAdapter(networkOptions, serialPortOptions, backupFile.name);
        const result = await adapter.start();
        expect(result).toBe('restored');
        expect(Znp).toBeCalledWith("dummy", 800, false);
        expect(mockZnpOpen).toBeCalledTimes(1);
        expect(mockZnpRequest.mock.calls[0][1]).toBe('version');
        expect(mockZnpRequest.mock.calls[1][2].id).toBe(NvItemsIds.ZNP_HAS_CONFIGURED_ZSTACK3);
        expect(mockZnpRequest.mock.calls[2][1]).toBe('version');
        expect(mockZnpRequest.mock.calls[3][1]).toBe('osalNvWrite');
        expect(mockZnpRequest.mock.calls[3][2]).toStrictEqual(backup.data.ZCD_NV_EXTADDR);
        expect(mockZnpRequest.mock.calls[4][1]).toBe('osalNvItemInit');
        expect(mockZnpRequest.mock.calls[4][2].value).toStrictEqual(backup.data.ZCD_NV_NIB.value);
        expect(mockZnpRequest.mock.calls[5][1]).toBe('osalNvWrite');
        expect(mockZnpRequest.mock.calls[5][2]).toStrictEqual(backup.data.ZCD_NV_PANID);
        expect(mockZnpRequest.mock.calls[6][1]).toBe('osalNvWrite');
        expect(mockZnpRequest.mock.calls[6][2]).toStrictEqual(backup.data.ZCD_NV_EXTENDED_PAN_ID);
        expect(mockZnpRequest.mock.calls[7][1]).toBe('osalNvWrite');
        expect(mockZnpRequest.mock.calls[7][2]).toStrictEqual(backup.data.ZCD_NV_NWK_ACTIVE_KEY_INFO);
        expect(mockZnpRequest.mock.calls[8][1]).toBe('osalNvWrite');
        expect(mockZnpRequest.mock.calls[8][2]).toStrictEqual(backup.data.ZCD_NV_NWK_ALTERN_KEY_INFO);
        expect(mockZnpRequest.mock.calls[9][1]).toBe('osalNvWrite');
        expect(mockZnpRequest.mock.calls[9][2]).toStrictEqual(backup.data.ZCD_NV_APS_USE_EXT_PANID);
        expect(mockZnpRequest.mock.calls[10][1]).toBe('osalNvWrite');
        expect(mockZnpRequest.mock.calls[10][2]).toStrictEqual(backup.data.ZCD_NV_PRECFGKEY);
        expect(mockZnpRequest.mock.calls[11][1]).toBe('osalNvWrite');
        expect(mockZnpRequest.mock.calls[11][2]).toStrictEqual(backup.data.ZCD_NV_PRECFGKEY_ENABLE);
        expect(mockZnpRequest.mock.calls[12][1]).toBe('osalNvWrite');
        expect(mockZnpRequest.mock.calls[12][2]).toStrictEqual(backup.data.ZCD_NV_TCLK_TABLE_START);
        expect(mockZnpRequest.mock.calls[13][1]).toBe('osalNvWrite');
        expect(mockZnpRequest.mock.calls[13][2]).toStrictEqual(backup.data.ZCD_NV_NWK_SEC_MATERIAL_TABLE_START);
        expect(mockZnpRequest.mock.calls[14][2].id).toBe(NvItemsIds.ZNP_HAS_CONFIGURED_ZSTACK3);
        expect(mockZnpRequest.mock.calls[15][2].id).toBe(NvItemsIds.ZNP_HAS_CONFIGURED_ZSTACK3);
        expect(mockZnpRequest.mock.calls[16][1]).toBe('osalNvItemInit');
        expect(mockZnpRequest.mock.calls[16][2].initvalue).toStrictEqual([1]);
        expect(mockZnpRequest.mock.calls[17][1]).toBe('osalNvWrite');
        expect(mockZnpRequest.mock.calls[17][2].value).toStrictEqual([1]);
        expect(mockZnpRequest.mock.calls[18][1]).toBe('resetReq');
        expect(mockZnpRequest.mock.calls[19][1]).toBe('getDeviceInfo');
        expect(mockZnpRequest.mock.calls[20][1]).toBe('activeEpReq');
        expect(mockZnpRequest.mock.calls[21][1]).toBe('osalNvWrite');
        expect(mockZnpRequest.mock.calls[21][2].value).toStrictEqual(Buffer.from([0, 8, 0, 0]));
        expect(mockZnpRequest).toBeCalledTimes(22);
    });

    it('Start restore from backup wrong zStack', async () => {
        mockZnpRequest.mockImplementation((subsystem, command, payload, expectedStatus) => {
            if (subsystem === Subsystem.SYS && command === 'osalNvRead' && equalsPartial(payload, {id: NvItemsIds.ZNP_HAS_CONFIGURED_ZSTACK3, offset: 0})) {
                return {payload: {value: Buffer.from([0])}};
            }
            else if (subsystem === Subsystem.SYS && command === 'version' && equals(payload, {})) {
                return {payload: {product: 2}};
            }

            throw new Error('missing');
        });

        const backup = {"adapterType":"zStack","time":"Mon, 19 Aug 2019 16:21:55 GMT","meta":{"product":1},"data":{"ZCD_NV_EXTADDR":{"id":1,"offset":0,"value":[174,68,1,18,0,75,18,0],"len":8},"ZCD_NV_NIB":{"id":33,"offset":0,"value":[230,5,2,16,20,16,0,20,0,0,0,1,5,1,143,7,0,2,5,30,0,0,14,0,0,0,0,0,0,0,0,0,0,114,60,8,0,64,0,0,15,15,4,0,1,0,0,0,1,0,0,0,0,174,68,1,18,0,75,18,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,60,3,0,1,120,10,1,0,0,65,0,0],"len":110},"ZCD_NV_EXTENDED_PAN_ID":{"id":45,"offset":0,"value":[174,68,1,18,0,75,18,0],"len":8},"ZCD_NV_NWK_ACTIVE_KEY_INFO":{"id":58,"offset":0,"value":[0,1,3,5,7,9,11,13,15,0,2,4,6,8,10,12,13],"len":17},"ZCD_NV_NWK_ALTERN_KEY_INFO":{"id":59,"offset":0,"value":[0,1,3,5,7,9,11,13,15,0,2,4,6,8,10,12,13],"len":17},"ZCD_NV_APS_USE_EXT_PANID":{"id":71,"offset":0,"value":[0,0,0,0,0,0,0,0],"len":8},"ZCD_NV_PRECFGKEY":{"id":98,"offset":0,"value":[1,3,5,7,9,11,13,15,0,2,4,6,8,10,12,13],"len":16},"ZCD_NV_PRECFGKEY_ENABLE":{"id":99,"offset":0,"value":[0],"len":1},"ZCD_NV_TCLK_TABLE_START":{"id":257,"offset":0,"value":[94,15,57,228,82,11,124,39,162,90,56,187,81,51,252,149],"len":16},"ZCD_NV_CHANLIST":{"id":132,"offset":0,"value":[0,8,0,0],"len":4},"ZCD_NV_NWK_SEC_MATERIAL_TABLE_START":{"id":117,"offset":0,"value":[123,63,0,0,174,68,1,18,0,75,18,0],"len":12}}};
        const backupFile = tmp.fileSync();
        fs.writeFileSync(backupFile.name, JSON.stringify(backup), 'utf8');
        adapter = new ZStackAdapter(networkOptions, serialPortOptions, backupFile.name);

        let error;
        try {await adapter.start()} catch (e) {error = e};
        expect(error).toStrictEqual(new Error("Cannot restore backup, backup is for 'zStack3x0', current is 'zStack30x'"));
    });

    it('Start restore from backup wrong adapter type', async () => {
        mockZnpRequest.mockImplementation((subsystem, command, payload, expectedStatus) => {
            if (subsystem === Subsystem.SYS && command === 'osalNvRead' && equalsPartial(payload, {id: NvItemsIds.ZNP_HAS_CONFIGURED_ZSTACK3, offset: 0})) {
                return {payload: {value: Buffer.from([0])}};
            }
            else if (subsystem === Subsystem.SYS && command === 'version' && equals(payload, {})) {
                return {payload: {product: 1}};
            }

            throw new Error('missing');
        });

        const backup = {"adapterType":"conbee","time":"Mon, 19 Aug 2019 16:21:55 GMT","meta":{"product":1},"data":{"ZCD_NV_EXTADDR":{"id":1,"offset":0,"value":[174,68,1,18,0,75,18,0],"len":8},"ZCD_NV_NIB":{"id":33,"offset":0,"value":[230,5,2,16,20,16,0,20,0,0,0,1,5,1,143,7,0,2,5,30,0,0,14,0,0,0,0,0,0,0,0,0,0,114,60,8,0,64,0,0,15,15,4,0,1,0,0,0,1,0,0,0,0,174,68,1,18,0,75,18,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,60,3,0,1,120,10,1,0,0,65,0,0],"len":110},"ZCD_NV_EXTENDED_PAN_ID":{"id":45,"offset":0,"value":[174,68,1,18,0,75,18,0],"len":8},"ZCD_NV_NWK_ACTIVE_KEY_INFO":{"id":58,"offset":0,"value":[0,1,3,5,7,9,11,13,15,0,2,4,6,8,10,12,13],"len":17},"ZCD_NV_NWK_ALTERN_KEY_INFO":{"id":59,"offset":0,"value":[0,1,3,5,7,9,11,13,15,0,2,4,6,8,10,12,13],"len":17},"ZCD_NV_APS_USE_EXT_PANID":{"id":71,"offset":0,"value":[0,0,0,0,0,0,0,0],"len":8},"ZCD_NV_PRECFGKEY":{"id":98,"offset":0,"value":[1,3,5,7,9,11,13,15,0,2,4,6,8,10,12,13],"len":16},"ZCD_NV_PRECFGKEY_ENABLE":{"id":99,"offset":0,"value":[0],"len":1},"ZCD_NV_TCLK_TABLE_START":{"id":257,"offset":0,"value":[94,15,57,228,82,11,124,39,162,90,56,187,81,51,252,149],"len":16},"ZCD_NV_CHANLIST":{"id":132,"offset":0,"value":[0,8,0,0],"len":4},"ZCD_NV_NWK_SEC_MATERIAL_TABLE_START":{"id":117,"offset":0,"value":[123,63,0,0,174,68,1,18,0,75,18,0],"len":12}}};
        const backupFile = tmp.fileSync();
        fs.writeFileSync(backupFile.name, JSON.stringify(backup), 'utf8');
        adapter = new ZStackAdapter(networkOptions, serialPortOptions, backupFile.name);

        let error;
        try {await adapter.start()} catch (e) {error = e};
        expect(error).toStrictEqual(new Error("Cannot restore backup, backup is for 'conbee', current is 'zStack'"));
    });

    it('Start restore from backup wrong adapter type', async () => {
        mockZnpRequest.mockImplementation((subsystem, command, payload, expectedStatus) => {
            if (subsystem === Subsystem.SYS && command === 'osalNvRead' && equalsPartial(payload, {id: NvItemsIds.ZNP_HAS_CONFIGURED_ZSTACK3, offset: 0})) {
                return {payload: {value: Buffer.from([0])}};
            }
            else if (subsystem === Subsystem.SYS && command === 'version' && equals(payload, {})) {
                return {payload: {product: 1}};
            }

            throw new Error('missing');
        });

        const backup = {"adapterType":"zStack","time":"Mon, 19 Aug 2019 16:21:55 GMT","meta":{"product":1},"data":{"ZCD_NV_EXTADDR":{"id":1,"offset":0,"value":[174,68,1,18,0,75,18,0],"len":8},"ZCD_NV_NIB":{"id":33,"offset":0,"value":[230,5,2,16,20,16,0,20,0,0,0,1,5,1,143,7,0,2,5,30,0,0,14,0,0,0,0,0,0,0,0,0,0,114,60,8,0,64,0,0,15,15,4,0,1,0,0,0,1,0,0,0,0,174,68,1,18,0,75,18,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,60,3,0,1,120,10,1,0,0,65,0,0],"len":110},"ZCD_NV_EXTENDED_PAN_ID":{"id":45,"offset":0,"value":[174,68,1,18,0,75,18,0],"len":8},"ZCD_NV_NWK_ACTIVE_KEY_INFO":{"id":58,"offset":0,"value":[0,1,3,5,7,9,11,13,15,0,2,4,6,8,10,12,13],"len":17},"ZCD_NV_NWK_ALTERN_KEY_INFO":{"id":59,"offset":0,"value":[0,1,3,5,7,9,11,13,15,0,2,4,6,8,10,12,13],"len":17},"ZCD_NV_APS_USE_EXT_PANID":{"id":71,"offset":0,"value":[0,0,0,0,0,0,0,0],"len":8},"ZCD_NV_PRECFGKEY":{"id":98,"offset":0,"value":[1,3,5,7,9,11,13,15,0,2,4,6,8,10,12,13],"len":16},"ZCD_NV_PRECFGKEY_ENABLE":{"id":99,"offset":0,"value":[0],"len":1},"ZCD_NV_TCLK_TABLE_START":{"id":257,"offset":0,"value":[94,15,57,228,82,11,124,39,162,90,56,187,81,51,252,149],"len":16},"ZCD_NV_CHANLIST":{"id":132,"offset":0,"value":[0,9,0,0],"len":4},"ZCD_NV_NWK_SEC_MATERIAL_TABLE_START":{"id":117,"offset":0,"value":[123,63,0,0,174,68,1,18,0,75,18,0],"len":12}}};
        const backupFile = tmp.fileSync();
        fs.writeFileSync(backupFile.name, JSON.stringify(backup), 'utf8');
        adapter = new ZStackAdapter(networkOptions, serialPortOptions, backupFile.name);

        let error;
        try {await adapter.start()} catch (e) {error = e};
        expect(error).toStrictEqual(new Error("Cannot restore backup, channel of backup is different"));
    });

    it('Start restore from backup wrong networkkey', async () => {
        mockZnpRequest.mockImplementation((subsystem, command, payload, expectedStatus) => {
            if (subsystem === Subsystem.SYS && command === 'osalNvRead' && equalsPartial(payload, {id: NvItemsIds.ZNP_HAS_CONFIGURED_ZSTACK3, offset: 0})) {
                return {payload: {value: Buffer.from([0])}};
            }
            else if (subsystem === Subsystem.SYS && command === 'version' && equals(payload, {})) {
                return {payload: {product: 1}};
            }

            throw new Error('missing');
        });

        const backup = {"adapterType":"zStack","time":"Mon, 19 Aug 2019 16:21:55 GMT","meta":{"product":1},"data":{"ZCD_NV_EXTADDR":{"id":1,"offset":0,"value":[174,68,1,18,0,75,18,0],"len":8},"ZCD_NV_NIB":{"id":33,"offset":0,"value":[230,5,2,16,20,16,0,20,0,0,0,1,5,1,143,7,0,2,5,30,0,0,14,0,0,0,0,0,0,0,0,0,0,114,60,8,0,64,0,0,15,15,4,0,1,0,0,0,1,0,0,0,0,174,68,1,18,0,75,18,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,60,3,0,1,120,10,1,0,0,65,0,0],"len":110},"ZCD_NV_EXTENDED_PAN_ID":{"id":45,"offset":0,"value":[174,68,1,18,0,75,18,0],"len":8},"ZCD_NV_NWK_ACTIVE_KEY_INFO":{"id":58,"offset":0,"value":[0,1,3,5,7,9,11,13,15,0,2,4,6,8,10,12,13],"len":17},"ZCD_NV_NWK_ALTERN_KEY_INFO":{"id":59,"offset":0,"value":[0,1,3,5,7,9,11,13,15,0,2,4,6,8,10,12,13],"len":17},"ZCD_NV_APS_USE_EXT_PANID":{"id":71,"offset":0,"value":[0,0,0,0,0,0,0,0],"len":8},"ZCD_NV_PRECFGKEY":{"id":98,"offset":0,"value":[1,3,5,8,9,11,13,15,0,2,4,6,8,10,12,13],"len":16},"ZCD_NV_PRECFGKEY_ENABLE":{"id":99,"offset":0,"value":[0],"len":1},"ZCD_NV_TCLK_TABLE_START":{"id":257,"offset":0,"value":[94,15,57,228,82,11,124,39,162,90,56,187,81,51,252,149],"len":16},"ZCD_NV_CHANLIST":{"id":132,"offset":0,"value":[0,8,0,0],"len":4},"ZCD_NV_NWK_SEC_MATERIAL_TABLE_START":{"id":117,"offset":0,"value":[123,63,0,0,174,68,1,18,0,75,18,0],"len":12}}};
        const backupFile = tmp.fileSync();
        fs.writeFileSync(backupFile.name, JSON.stringify(backup), 'utf8');
        adapter = new ZStackAdapter(networkOptions, serialPortOptions, backupFile.name);

        let error;
        try {await adapter.start()} catch (e) {error = e};
        expect(error).toStrictEqual(new Error("Cannot restore backup, networkKey of backup is different"));
    });

    it('Start restore from backup wrong panID', async () => {
        mockZnpRequest.mockImplementation((subsystem, command, payload, expectedStatus) => {
            if (subsystem === Subsystem.SYS && command === 'osalNvRead' && equalsPartial(payload, {id: NvItemsIds.ZNP_HAS_CONFIGURED_ZSTACK3, offset: 0})) {
                return {payload: {value: Buffer.from([0])}};
            }
            else if (subsystem === Subsystem.SYS && command === 'version' && equals(payload, {})) {
                return {payload: {product: 1}};
            }

            throw new Error('missing');
        });

        const backup = {"adapterType":"zStack","time":"Mon, 19 Aug 2019 16:21:55 GMT","meta":{"product":1},"data":{"ZCD_NV_PANID":{"id": 131,"offset": 0,"value": [123,1],"len": 2},"ZCD_NV_EXTADDR":{"id":1,"offset":0,"value":[174,68,1,18,0,75,18,0],"len":8},"ZCD_NV_NIB":{"id":33,"offset":0,"value":[230,5,2,16,20,16,0,20,0,0,0,1,5,1,143,7,0,2,5,30,0,0,14,0,0,0,0,0,0,0,0,0,0,114,60,8,0,64,0,0,15,15,4,0,1,0,0,0,1,0,0,0,0,174,68,1,18,0,75,18,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,60,3,0,1,120,10,1,0,0,65,0,0],"len":110},"ZCD_NV_EXTENDED_PAN_ID":{"id":45,"offset":0,"value":[174,68,1,18,0,75,18,0],"len":8},"ZCD_NV_NWK_ACTIVE_KEY_INFO":{"id":58,"offset":0,"value":[0,1,3,5,7,9,11,13,15,0,2,4,6,8,10,12,13],"len":17},"ZCD_NV_NWK_ALTERN_KEY_INFO":{"id":59,"offset":0,"value":[0,1,3,5,7,9,11,13,15,0,2,4,6,8,10,12,13],"len":17},"ZCD_NV_APS_USE_EXT_PANID":{"id":71,"offset":0,"value":[0,0,0,0,0,0,0,0],"len":8},"ZCD_NV_PRECFGKEY":{"id":98,"offset":0,"value":[1,3,5,7,9,11,13,15,0,2,4,6,8,10,12,13],"len":16},"ZCD_NV_PRECFGKEY_ENABLE":{"id":99,"offset":0,"value":[0],"len":1},"ZCD_NV_TCLK_TABLE_START":{"id":257,"offset":0,"value":[94,15,57,228,82,11,124,39,162,90,56,187,81,51,252,149],"len":16},"ZCD_NV_CHANLIST":{"id":132,"offset":0,"value":[0,8,0,0],"len":4},"ZCD_NV_NWK_SEC_MATERIAL_TABLE_START":{"id":117,"offset":0,"value":[123,63,0,0,174,68,1,18,0,75,18,0],"len":12}}};
        const backupFile = tmp.fileSync();
        fs.writeFileSync(backupFile.name, JSON.stringify(backup), 'utf8');
        adapter = new ZStackAdapter(networkOptions, serialPortOptions, backupFile.name);

        let error;
        try {await adapter.start()} catch (e) {error = e};
        expect(error).toStrictEqual(new Error("Cannot restore backup, panID of backup is different"));
    });

    it('Start restore from backup wrong extendedPanID', async () => {
        mockZnpRequest.mockImplementation((subsystem, command, payload, expectedStatus) => {
            if (subsystem === Subsystem.SYS && command === 'osalNvRead' && equalsPartial(payload, {id: NvItemsIds.ZNP_HAS_CONFIGURED_ZSTACK3, offset: 0})) {
                return {payload: {value: Buffer.from([0])}};
            }
            else if (subsystem === Subsystem.SYS && command === 'version' && equals(payload, {})) {
                return {payload: {product: 1}};
            }

            throw new Error('missing');
        });

        const backup = {"adapterType":"zStack","time":"Mon, 19 Aug 2019 16:21:55 GMT","meta":{"product":1},"data":{"ZCD_NV_PANID":{"id": 131,"offset": 0,"value": [123,0],"len": 2},"ZCD_NV_EXTADDR":{"id":1,"offset":0,"value":[174,68,1,18,0,75,18,0],"len":8},"ZCD_NV_NIB":{"id":33,"offset":0,"value":[230,5,2,16,20,16,0,20,0,0,0,1,5,1,143,7,0,2,5,30,0,0,14,0,0,0,0,0,0,0,0,0,0,114,60,8,0,64,0,0,15,15,4,0,1,0,0,0,1,0,0,0,0,174,68,1,18,0,75,18,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,60,3,0,1,120,10,1,0,0,65,0,0],"len":110},"ZCD_NV_EXTENDED_PAN_ID":{"id":45,"offset":0,"value":[175,68,1,18,0,75,18,0],"len":8},"ZCD_NV_NWK_ACTIVE_KEY_INFO":{"id":58,"offset":0,"value":[0,1,3,5,7,9,11,13,15,0,2,4,6,8,10,12,13],"len":17},"ZCD_NV_NWK_ALTERN_KEY_INFO":{"id":59,"offset":0,"value":[0,1,3,5,7,9,11,13,15,0,2,4,6,8,10,12,13],"len":17},"ZCD_NV_APS_USE_EXT_PANID":{"id":71,"offset":0,"value":[0,0,0,0,0,0,0,0],"len":8},"ZCD_NV_PRECFGKEY":{"id":98,"offset":0,"value":[1,3,5,7,9,11,13,15,0,2,4,6,8,10,12,13],"len":16},"ZCD_NV_PRECFGKEY_ENABLE":{"id":99,"offset":0,"value":[0],"len":1},"ZCD_NV_TCLK_TABLE_START":{"id":257,"offset":0,"value":[94,15,57,228,82,11,124,39,162,90,56,187,81,51,252,149],"len":16},"ZCD_NV_CHANLIST":{"id":132,"offset":0,"value":[0,8,0,0],"len":4},"ZCD_NV_NWK_SEC_MATERIAL_TABLE_START":{"id":117,"offset":0,"value":[123,63,0,0,174,68,1,18,0,75,18,0],"len":12}}};
        const backupFile = tmp.fileSync();
        fs.writeFileSync(backupFile.name, JSON.stringify(backup), 'utf8');
        adapter = new ZStackAdapter(networkOptions, serialPortOptions, backupFile.name);

        let error;
        try {await adapter.start()} catch (e) {error = e};
        expect(error).toStrictEqual(new Error("Cannot restore backup, extendedPanID of backup is different"));
    });

    it('Create backup', async () => {
        const backup = {"adapterType":"zStack","time":"Mon, 19 Aug 2019 16:21:55 GMT","meta":{"product":1},"data":{"ZCD_NV_PANID":{"id": 131,"offset": 0,"value": [123,0],"len": 2},"ZCD_NV_EXTADDR":{"id":1,"offset":0,"value":[174,68,1,18,0,75,18,0],"len":8},"ZCD_NV_NIB":{"id":33,"offset":0,"value":[230,5,2,16,20,16,0,20,0,0,0,1,5,1,143,7,0,2,5,30,0,0,14,0,0,0,0,0,0,0,0,0,0,114,60,8,0,64,0,0,15,15,4,0,1,0,0,0,1,0,0,0,0,174,68,1,18,0,75,18,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,60,3,0,1,120,10,1,0,0,65,0,0],"len":110},"ZCD_NV_EXTENDED_PAN_ID":{"id":45,"offset":0,"value":Array.from(networkOptions.extenedPanID),"len":networkOptions.extenedPanID.length},"ZCD_NV_NWK_ACTIVE_KEY_INFO":{"id":58,"offset":0,"value":[0,1,3,5,7,9,11,13,15,0,2,4,6,8,10,12,13],"len":17},"ZCD_NV_NWK_ALTERN_KEY_INFO":{"id":59,"offset":0,"value":[0,1,3,5,7,9,11,13,15,0,2,4,6,8,10,12,13],"len":17},"ZCD_NV_APS_USE_EXT_PANID":{"id":71,"offset":0,"value":[0,0,0,0,0,0,0,0],"len":8},"ZCD_NV_PRECFGKEY":{"id":98,"offset":0,"value":[1,3,5,7,9,11,13,15,0,2,4,6,8,10,12,13],"len":16},"ZCD_NV_PRECFGKEY_ENABLE":{"id":99,"offset":0,"value":[0],"len":1},"ZCD_NV_TCLK_TABLE_START":{"id":257,"offset":0,"value":[94,15,57,228,82,11,124,39,162,90,56,187,81,51,252,149],"len":16},"ZCD_NV_CHANLIST":{"id":132,"offset":0,"value":[0,8,0,0],"len":4},"ZCD_NV_NWK_SEC_MATERIAL_TABLE_START":{"id":117,"offset":0,"value":[123,63,0,0,174,68,1,18,0,75,18,0],"len":12}}};

        mockZnpRequest.mockImplementation((subsystem, command, payload, expectedStatus) => {
            const missing = () => {
                const msg = `Not implemented - ${Subsystem[subsystem]} - ${command} - ${JSON.stringify(payload)}`;
                console.log(msg)
                throw new Error(msg);
            }

            if (subsystem === Subsystem.SYS && command === 'version' && equals(payload, {})) {
                return {payload: {product: 1}};
            } else if (subsystem === Subsystem.SYS && command === 'osalNvRead') {
                if (equalsPartial(payload, {id: NvItemsIds.ZNP_HAS_CONFIGURED_ZSTACK3, offset: 0})) {
                    return {payload: {value: Buffer.from([0x55])}};
                } else if (equalsPartial(payload, {id: NvItemsIds.CHANLIST, offset: 0})) {
                    return {payload: {value: Buffer.from([0,8,0,0])}};
                } else if (equalsPartial(payload, {id: NvItemsIds.PRECFGKEYS_ENABLE, offset: 0})) {
                    return {payload: {value: Buffer.from([0])}};
                } else if (equalsPartial(payload, {id: NvItemsIds.PRECFGKEY, offset: 0})) {
                    return {payload: {value: Buffer.from(networkOptions.networkKey)}};
                } else if (equalsPartial(payload, {id: NvItemsIds.EXTADDR, offset: 0})) {
                    return {payload: {value: Buffer.from(backup.data.ZCD_NV_EXTADDR.value)}};
                } else if (equalsPartial(payload, {id: NvItemsIds.NIB, offset: 0})) {
                    return {payload: {value: Buffer.from(backup.data.ZCD_NV_NIB.value)}};
                } else if (equalsPartial(payload, {id: NvItemsIds.EXTENDED_PAN_ID, offset: 0})) {
                    return {payload: {value: Buffer.from(backup.data.ZCD_NV_EXTENDED_PAN_ID.value)}};
                } else if (equalsPartial(payload, {id: NvItemsIds.NWK_ACTIVE_KEY_INFO, offset: 0})) {
                    return {payload: {value: Buffer.from(backup.data.ZCD_NV_NWK_ACTIVE_KEY_INFO.value)}};
                } else if (equalsPartial(payload, {id: NvItemsIds.NWK_ALTERN_KEY_INFO, offset: 0})) {
                    return {payload: {value: Buffer.from(backup.data.ZCD_NV_NWK_ALTERN_KEY_INFO.value)}};
                } else if (equalsPartial(payload, {id: NvItemsIds.APS_USE_EXT_PANID, offset: 0})) {
                    return {payload: {value: Buffer.from(backup.data.ZCD_NV_APS_USE_EXT_PANID.value)}};
                } else if (equalsPartial(payload, {id: NvItemsIds.PRECFGKEY, offset: 0})) {
                    return {payload: {value: Buffer.from(backup.data.ZCD_NV_PRECFGKEY.value)}};
                } else if (equalsPartial(payload, {id: NvItemsIds.PRECFGKEY_ENABLE, offset: 0})) {
                    return {payload: {value: Buffer.from(backup.data.ZCD_NV_PRECFGKEY_ENABLE.value)}};
                } else if (equalsPartial(payload, {id: NvItemsIds.TCLK_TABLE_START, offset: 0})) {
                    return {payload: {value: Buffer.from(backup.data.ZCD_NV_TCLK_TABLE_START.value)}};
                } else if (equalsPartial(payload, {id: NvItemsIds.CHANLIST, offset: 0})) {
                    return {payload: {value: Buffer.from(backup.data.ZCD_NV_CHANLIST.value)}};
                } else if (equalsPartial(payload, {id: NvItemsIds.NWK_SEC_MATERIAL_TABLE_START, offset: 0})) {
                    return {payload: {value: Buffer.from(backup.data.ZCD_NV_NWK_SEC_MATERIAL_TABLE_START.value)}};
                } else if (equalsPartial(payload, {id: NvItemsIds.PANID, offset: 0})) {
                    return {payload: {value: Buffer.from([networkOptions.panID, 0])}};
                } else {
                    missing();
                }
            } else if (subsystem === Subsystem.UTIL && command === 'getDeviceInfo') {
                return {payload: {devicestate: Constants.COMMON.devStates.ZB_COORD}};
            } else if (subsystem === Subsystem.ZDO && command === 'activeEpReq') {
                return {};
            } else {
                missing();
            }
        });

        mockZnpWaitfor.mockImplementation((type, subsystem, command, payload) => {
            const missing = () => {
                const msg = `Not implemented - ${Type[type]} - ${Subsystem[subsystem]} - ${command} - ${JSON.stringify(payload)}`;
                console.log(msg)
                throw new Error(msg);
            }

            if (type === Type.AREQ && subsystem === Subsystem.ZDO && command === 'activeEpRsp') {
                return {payload: {activeeplist: [1, 2, 3, 4, 5, 6, 11]}};
            } else if (type === Type.AREQ && subsystem === Subsystem.ZDO && command === 'stateChangeInd') {
                return {payload: {}};
            } else {
                missing();
            }
        });

        const result = await adapter.start();
        const actualBackup = await adapter.backup();
        delete backup.time;
        delete actualBackup.time;
        expect(equals(backup, actualBackup)).toBeTruthy();
    });

    it('Create backup for zStack 1.2 error', async () => {
        basicMocks();
        await adapter.start();
        let error;
        try {await adapter.backup()} catch (e) {error = e};
        expect(error).toStrictEqual(new Error('Backup is only supported for Z-Stack 3'));
    });

    it('Close adapter', async () => {
        basicMocks();
        await adapter.start();
        await adapter.stop();
        expect(mockZnpClose).toBeCalledTimes(1);
    });

    it('Get coordinator', async () => {
        basicMocks();
        await adapter.start();
        const info = await adapter.getCoordinator();
        const expected = {
            "networkAddress":0,
            "manufacturerID":0,
            "ieeeAddr":"0x123",
            "endpoints":[{
                  "ID":1,
                  "profileID":123,
                  "deviceID":5,
                  "inputClusters":[
                     1
                  ],
                  "outputClusters":[
                     2
                  ]
               },
               {
                  "ID":2,
                  "profileID":124,
                  "deviceID":7,
                  "inputClusters":[
                     8
                  ],
                  "outputClusters":[
                     9
                  ]
               },
               {
                  "ID":3,
                  "profileID":124,
                  "deviceID":7,
                  "inputClusters":[
                     8
                  ],
                  "outputClusters":[
                     9
                  ]
               },
               {
                  "ID":4,
                  "profileID":124,
                  "deviceID":7,
                  "inputClusters":[
                     8
                  ],
                  "outputClusters":[
                     9
                  ]
               },
               {
                  "ID":5,
                  "profileID":124,
                  "deviceID":7,
                  "inputClusters":[
                     8
                  ],
                  "outputClusters":[
                     9
                  ]
               },
               {
                  "ID":6,
                  "profileID":124,
                  "deviceID":7,
                  "inputClusters":[
                     8
                  ],
                  "outputClusters":[
                     9
                  ]
               },
               {
                  "ID":11,
                  "profileID":124,
                  "deviceID":7,
                  "inputClusters":[
                     8
                  ],
                  "outputClusters":[
                     9
                  ]
               }
            ]
         };
        expect(info).toStrictEqual(expected)
    });

    it('Permit join', async () => {
        basicMocks();
        await adapter.start();
        mockZnpRequest.mockClear();
        await adapter.permitJoin(100);
        expect(mockZnpRequest).toBeCalledTimes(1);
        expect(mockZnpRequest).toBeCalledWith(Subsystem.ZDO, 'mgmtPermitJoinReq', {addrmode: 0x0F, dstaddr: 0xFFFC , duration: 100, tcsignificance: 0 });
    });

    it('Get coordinator version', async () => {
        basicMocks();
        await adapter.start();
        mockZnpRequest.mockClear();
        expect(await adapter.getCoordinatorVersion()).toStrictEqual({type: 'zStack12', meta: {revision: '20190425', product: 0}})
    });

    it('Soft reset', async () => {
        basicMocks();
        await adapter.start();
        mockZnpRequest.mockClear();
        await adapter.softReset();
        expect(mockZnpRequest).toBeCalledTimes(1);
        expect(mockZnpRequest).toBeCalledWith(Subsystem.SYS, 'resetReq', {type: 1});
    });

    it('Disable led', async () => {
        basicMocks();
        await adapter.start();
        mockZnpRequest.mockClear();
        await adapter.disableLED();
        expect(mockZnpRequest).toBeCalledTimes(1);
        expect(mockZnpRequest).toBeCalledWith(Subsystem.UTIL, 'ledControl', {ledid: 3, mode: 0});
    });

    it('Node descriptor', async () => {
        basicMocks();
        let result;
        await adapter.start();

        mockZnpRequest.mockClear();
        result = await adapter.nodeDescriptor(2);
        expect(mockZnpWaitfor).toBeCalledWith(Type.AREQ, Subsystem.ZDO, 'nodeDescRsp', {nwkaddr: 2});
        expect(mockZnpRequest).toBeCalledTimes(1);
        expect(mockZnpRequest).toBeCalledWith(Subsystem.ZDO, 'nodeDescReq', {dstaddr: 2, nwkaddrofinterest: 2});
        expect(mockQueueExecute.mock.calls[0][1]).toBe(2);
        expect(result).toStrictEqual({manufacturerCode: 4, type: 'Router'})

        mockZnpRequest.mockClear();
        result = await adapter.nodeDescriptor(1);
        expect(result).toStrictEqual({manufacturerCode: 2, type: 'Coordinator'})

        mockZnpRequest.mockClear();
        result = await adapter.nodeDescriptor(3);
        expect(result).toStrictEqual({manufacturerCode: 6, type: 'EndDevice'})

        mockZnpRequest.mockClear();
        result = await adapter.nodeDescriptor(5);
        expect(result).toStrictEqual({manufacturerCode: 10, type: 'Unknown'})
    });

    it('Active endpionts', async () => {
        basicMocks();
        await adapter.start();

        const result = await adapter.activeEndpoints(3);
        expect(mockQueueExecute.mock.calls[0][1]).toBe(3);
        expect(result).toStrictEqual({endpoints: [1,2,3,4,5,6,11]})
    });

    it('Simple descriptor', async () => {
        basicMocks();
        await adapter.start();

        const result = await adapter.simpleDescriptor(1, 20);
        expect(mockQueueExecute.mock.calls[0][1]).toBe(1);
        expect(result).toStrictEqual({deviceID: 7, endpointID: 20, inputClusters: [8], outputClusters: [9], profileID: 124});
    });

    it('Send zcl frame network address', async () => {
        basicMocks();
        await adapter.start();

        mockZnpRequest.mockClear();
        const frame = Zcl.ZclFrame.create(Zcl.FrameType.GLOBAL, Zcl.Direction.CLIENT_TO_SERVER, true, null, 100, 'read', 0, [{attrId: 0}]);
        await adapter.sendZclFrameNetworkAddress(2, 20, frame);
        expect(mockQueueExecute.mock.calls[0][1]).toBe(2);
        expect(mockZnpRequest).toBeCalledTimes(1);
        expect(mockZnpRequest).toBeCalledWith(4, "dataRequest", {"clusterid": 0, "data": frame.toBuffer(), "destendpoint": 20, "dstaddr": 2, "len": 5, "options": 0, "radius": 30, "srcendpoint": 1, "transid": 1})
    });

    it('Send zcl frame network address fails', async () => {
        basicMocks();
        await adapter.start();
        dataConfirmCode = 205;
        mockZnpRequest.mockClear();
        const frame = Zcl.ZclFrame.create(Zcl.FrameType.GLOBAL, Zcl.Direction.CLIENT_TO_SERVER, false, null, 100, 'read', 0, [{attrId: 0}]);
        let error;
        try {await adapter.sendZclFrameNetworkAddress(2, 20, frame)} catch (e) {error = e;}
        expect(error).toStrictEqual(new Error("Data request failed with error: 'No network route' (205)"));
    });

    it('Send zcl frame network address with default response', async () => {
        basicMocks();
        await adapter.start();
        const defaultReponse = Zcl.ZclFrame.create(Zcl.FrameType.GLOBAL, Zcl.Direction.SERVER_TO_CLIENT, true, null, 100, 'defaultRsp', 0, {cmdId: 0, status: 0});
        const object = {type: Type.AREQ, subsystem: Subsystem.AF, command: 'incomingMsg', payload: {clusterid: 0, srcendpoint: 20, srcaddr: 2, linkquality: 101, groupid: 12, data: defaultReponse.toBuffer()}};
        mockZnpRequest.mockClear();
        const frame = Zcl.ZclFrame.create(Zcl.FrameType.GLOBAL, Zcl.Direction.CLIENT_TO_SERVER, false, null, 100, 'read', 0, [{attrId: 0}]);
        const request =  adapter.sendZclFrameNetworkAddress(2, 20, frame);
        znpReceived(object);
        await request;
        expect(mockQueueExecute.mock.calls[0][1]).toBe(2);
        expect(mockZnpRequest).toBeCalledTimes(1);
        expect(mockZnpRequest).toBeCalledWith(4, "dataRequest", {"clusterid": 0, "data": frame.toBuffer(), "destendpoint": 20, "dstaddr": 2, "len": 5, "options": 0, "radius": 30, "srcendpoint": 1, "transid": 1})
    });

    it('Send zcl frame network address fails', async () => {
        basicMocks();
        await adapter.start();
        dataConfirmCode = 205;
        mockZnpRequest.mockClear();
        const frame = Zcl.ZclFrame.create(Zcl.FrameType.GLOBAL, Zcl.Direction.CLIENT_TO_SERVER, true, null, 100, 'read', 0, [{attrId: 0}]);
        let error;
        try {await adapter.sendZclFrameNetworkAddress(2, 20, frame)} catch (e) { error = e};
        expect(mockQueueExecute.mock.calls[0][1]).toBe(2);
        expect(mockZnpRequest).toBeCalledTimes(1);
        expect(mockZnpRequest).toBeCalledWith(4, "dataRequest", {"clusterid": 0, "data": frame.toBuffer(), "destendpoint": 20, "dstaddr": 2, "len": 5, "options": 0, "radius": 30, "srcendpoint": 1, "transid": 1})
        expect(error).toStrictEqual(new Error("Data request failed with error: 'No network route' (205)"));
    });

    it('Send zcl frame network address with missing default response', async () => {
        jest.useFakeTimers();
        basicMocks();
        await adapter.start();
        mockZnpRequest.mockClear();
        const frame = Zcl.ZclFrame.create(Zcl.FrameType.GLOBAL, Zcl.Direction.CLIENT_TO_SERVER, false, null, 100, 'read', 0, [{attrId: 0}]);
        const request =  adapter.sendZclFrameNetworkAddress(2, 20, frame);
        let error;
        jest.runAllTimers();
        try {await request} catch (e) {error = e}
        expect(error).toStrictEqual(new Error('Timeout - 2 - 20 - 100 - 11 after 15000ms'));
    });

    it('Send zcl frame group', async () => {
        basicMocks();
        await adapter.start();

        mockZnpRequest.mockClear();
        const frame = Zcl.ZclFrame.create(Zcl.FrameType.GLOBAL, Zcl.Direction.CLIENT_TO_SERVER, true, null, 100, 'read', 0, [{attrId: 0}]);
        await adapter.sendZclFrameGroup(25, frame);
        expect(mockQueueExecute.mock.calls[0][1]).toBe(undefined);
        expect(mockZnpRequest).toBeCalledTimes(1);
        expect(mockZnpRequest).toBeCalledWith(4, "dataRequestExt", {"clusterid": 0, "data": frame.toBuffer(), "destendpoint": 255, "dstaddr": "0x0000000000000019", "len": 5, "options": 0, "radius": 30, "srcendpoint": 1, "transid": 1, "dstaddrmode": 1, "dstpanid": 0})
    });

    it('Send zcl frame network address transaction number shouldnt go higher than 255', async () => {
        basicMocks();
        await adapter.start();
        let transactionID = 0;

        mockZnpRequest.mockClear();

        for (let i = 0; i < 300; i++) {
            if (transactionID > 200) {
                transactionID = 0;
            }

            const frame = Zcl.ZclFrame.create(Zcl.FrameType.GLOBAL, Zcl.Direction.CLIENT_TO_SERVER, true, null, transactionID++, 'read', 0, [{attrId: 0}]);
            await adapter.sendZclFrameNetworkAddress(2, 20, frame);
        }

        const got = []
        for (let i = 0; i < 300; i++) {
            got.push(mockZnpRequest.mock.calls[i][2].transid);
        }

        expect(got[0]).toBe(1);
        expect(got.find((g) => g === 0)).toBe(undefined);
        expect(got.find((g) => g > 255)).toBe(undefined);
        expect(got.filter((g) => g === 1).length).toBe(2);
        expect(got.filter((g) => g === 255).length).toBe(1);
        expect(mockZnpRequest).toBeCalledTimes(300);
    });

    it('Send zcl frame group fails', async () => {
        basicMocks();
        await adapter.start();
        dataConfirmCode = 184;
        let error;
        mockZnpRequest.mockClear();
        const frame = Zcl.ZclFrame.create(Zcl.FrameType.GLOBAL, Zcl.Direction.CLIENT_TO_SERVER, true, null, 100, 'read', 0, [{attrId: 0}]);
        try {await adapter.sendZclFrameGroup(25, frame);} catch (e) { error = e};
        expect(mockQueueExecute.mock.calls[0][1]).toBe(undefined);
        expect(mockZnpRequest).toBeCalledTimes(1);
        expect(mockZnpRequest).toBeCalledWith(4, "dataRequestExt", {"clusterid": 0, "data": frame.toBuffer(), "destendpoint": 255, "dstaddr": "0x0000000000000019", "len": 5, "options": 0, "radius": 30, "srcendpoint": 1, "transid": 1, "dstaddrmode": 1, "dstpanid": 0})
        expect(error).toStrictEqual(new Error("Data request failed with error: 'undefined' (184)"));
    });

    it('Send zcl frame network address with response and default response', async () => {
        basicMocks();
        await adapter.start();

        mockZnpRequest.mockClear();

        const responseMismatchFrame = Zcl.ZclFrame.create(Zcl.FrameType.GLOBAL, Zcl.Direction.SERVER_TO_CLIENT, true, null, 102, 'readRsp', 0, [{attrId: 0, attrData: 5, dataType: 32, status: 0}]);
        const responseFrame = Zcl.ZclFrame.create(Zcl.FrameType.GLOBAL, Zcl.Direction.SERVER_TO_CLIENT, true, null, 100, 'readRsp', 0, [{attrId: 0, attrData: 2, dataType: 32, status: 0}]);
        const frame = Zcl.ZclFrame.create(Zcl.FrameType.GLOBAL, Zcl.Direction.CLIENT_TO_SERVER, true, null, 100, 'read', 0, [{attrId: 0}]);
        const object = {type: Type.AREQ, subsystem: Subsystem.AF, command: 'incomingMsg', payload: {clusterid: 0, srcendpoint: 20, srcaddr: 2, linkquality: 101, groupid: 12, data: responseFrame.toBuffer()}};
        const objectMismatch = {type: Type.AREQ, subsystem: Subsystem.AF, command: 'incomingMsg', payload: {clusterid: 0, srcendpoint: 20, srcaddr: 2, linkquality: 101, groupid: 12, data: responseMismatchFrame.toBuffer()}};
        const response = adapter.sendZclFrameNetworkAddressWithResponse(2, 20, frame);
        znpReceived(objectMismatch);
        znpReceived(object);
        const result = await response;

        expect(mockZnpRequest).toBeCalledWith(4, "dataRequest", {"clusterid": 0, "data": frame.toBuffer(), "destendpoint": 20, "dstaddr": 2, "len": 5, "options": 0, "radius": 30, "srcendpoint": 1, "transid": 1})
        expect(mockQueueExecute.mock.calls[0][1]).toBe(2);
        expect(mockZnpRequest).toBeCalledTimes(1);
        expect(result.endpoint).toStrictEqual(20);
        expect(result.groupID).toStrictEqual(12);
        expect(result.linkquality).toStrictEqual(101);
        expect(result.networkAddress).toStrictEqual(2);
        expect(result.frame).toStrictEqual(responseFrame);
    });

    it('Send zcl frame network address with response with command which has no response', async () => {
        basicMocks();
        await adapter.start();
        const frame = Zcl.ZclFrame.create(Zcl.FrameType.GLOBAL, Zcl.Direction.CLIENT_TO_SERVER, true, null, 100, 'readRsp', 0, [{attrId: 0}]);
        let error;
        try {await adapter.sendZclFrameNetworkAddressWithResponse(2, 20, frame);} catch (e) {error = e}
        expect(error).toStrictEqual(new Error("Command 'readRsp' has no response, cannot wait for response"));
    });

    it('Send zcl frame network address with response and default response', async () => {
        basicMocks();
        await adapter.start();

        mockZnpRequest.mockClear();

        const responseMismatchFrame = Zcl.ZclFrame.create(Zcl.FrameType.GLOBAL, Zcl.Direction.SERVER_TO_CLIENT, true, null, 102, 'readRsp', 0, [{attrId: 0, attrData: 5, dataType: 32, status: 0}]);
        const responseFrame = Zcl.ZclFrame.create(Zcl.FrameType.GLOBAL, Zcl.Direction.SERVER_TO_CLIENT, true, null, 100, 'readRsp', 0, [{attrId: 0, attrData: 2, dataType: 32, status: 0}]);
        const frame = Zcl.ZclFrame.create(Zcl.FrameType.GLOBAL, Zcl.Direction.CLIENT_TO_SERVER, false, null, 100, 'read', 0, [{attrId: 0}]);
        const object = {type: Type.AREQ, subsystem: Subsystem.AF, command: 'incomingMsg', payload: {clusterid: 0, srcendpoint: 20, srcaddr: 2, linkquality: 101, groupid: 12, data: responseFrame.toBuffer()}};
        const objectMismatch = {type: Type.AREQ, subsystem: Subsystem.AF, command: 'incomingMsg', payload: {clusterid: 0, srcendpoint: 20, srcaddr: 2, linkquality: 101, groupid: 12, data: responseMismatchFrame.toBuffer()}};
        const defaultReponse = Zcl.ZclFrame.create(Zcl.FrameType.GLOBAL, Zcl.Direction.SERVER_TO_CLIENT, true, null, 100, 'defaultRsp', 0, {cmdId: 0, status: 0});
        const defaultObject = {type: Type.AREQ, subsystem: Subsystem.AF, command: 'incomingMsg', payload: {clusterid: 0, srcendpoint: 20, srcaddr: 2, linkquality: 101, groupid: 12, data: defaultReponse.toBuffer()}};
        const response = adapter.sendZclFrameNetworkAddressWithResponse(2, 20, frame);
        znpReceived(objectMismatch);
        znpReceived(defaultObject);
        znpReceived(object);
        const result = await response;

        expect(mockZnpRequest).toBeCalledWith(4, "dataRequest", {"clusterid": 0, "data": frame.toBuffer(), "destendpoint": 20, "dstaddr": 2, "len": 5, "options": 0, "radius": 30, "srcendpoint": 1, "transid": 1})
        expect(mockQueueExecute.mock.calls[0][1]).toBe(2);
        expect(mockZnpRequest).toBeCalledTimes(1);
        expect(result.endpoint).toStrictEqual(20);
        expect(result.groupID).toStrictEqual(12);
        expect(result.linkquality).toStrictEqual(101);
        expect(result.networkAddress).toStrictEqual(2);
        expect(result.frame).toStrictEqual(responseFrame);
    });

    it('Send zcl frame network address data confirm fails with default response', async () => {
        basicMocks();
        await adapter.start();
        dataConfirmCode = 205;
        const frame = Zcl.ZclFrame.create(Zcl.FrameType.GLOBAL, Zcl.Direction.CLIENT_TO_SERVER, false, null, 100, 'read', 0, [{attrId: 0}]);
        let error;
        try {await adapter.sendZclFrameNetworkAddressWithResponse(2, 20, frame)} catch (e) {error = e;}
        expect(error).toStrictEqual(new Error("Data request failed with error: 'No network route' (205)"));
    });

    it('Send zcl frame network address data confirm fails without default response', async () => {
        basicMocks();
        await adapter.start();
        dataConfirmCode = 205;
        const frame = Zcl.ZclFrame.create(Zcl.FrameType.GLOBAL, Zcl.Direction.CLIENT_TO_SERVER, true, null, 100, 'read', 0, [{attrId: 0}]);
        let error;
        try {await adapter.sendZclFrameNetworkAddressWithResponse(2, 20, frame)} catch (e) {error = e;}
        expect(error).toStrictEqual(new Error("Data request failed with error: 'No network route' (205)"));
    });

    it('Send zcl frame network address with response timeout', async () => {
        basicMocks();
        await adapter.start();

        mockZnpRequest.mockClear();

        const responseMismatchFrame = Zcl.ZclFrame.create(Zcl.FrameType.GLOBAL, Zcl.Direction.SERVER_TO_CLIENT, true, null, 102, 'readRsp', 0, [{attrId: 0, attrData: 5, dataType: 32, status: 0}]);
        const frame = Zcl.ZclFrame.create(Zcl.FrameType.GLOBAL, Zcl.Direction.CLIENT_TO_SERVER, false, null, 100, 'read', 0, [{attrId: 0}]);
        const objectMismatch = {type: Type.AREQ, subsystem: Subsystem.AF, command: 'incomingMsg', payload: {clusterid: 0, srcendpoint: 20, srcaddr: 2, linkquality: 101, groupid: 12, data: responseMismatchFrame.toBuffer()}};
        jest.useFakeTimers();
        const response = adapter.sendZclFrameNetworkAddressWithResponse(2, 20, frame);
        znpReceived(objectMismatch);

        let error;
        try {jest.runAllTimers(); await response} catch (e) {error = e;}
        expect(mockZnpRequest).toBeCalledWith(4, "dataRequest", {"clusterid": 0, "data": frame.toBuffer(), "destendpoint": 20, "dstaddr": 2, "len": 5, "options": 0, "radius": 30, "srcendpoint": 1, "transid": 1})
        expect(mockQueueExecute.mock.calls[0][1]).toBe(2);
        expect(mockZnpRequest).toBeCalledTimes(1);
        expect(error).toStrictEqual(new Error("Timeout - 2 - 20 - 100 - 1 after 10000ms"));
    });

    it('Send zcl frame network address with default response timeout', async () => {
        basicMocks();
        await adapter.start();

        mockZnpRequest.mockClear();
        jest.useFakeTimers();
        const responseFrame = Zcl.ZclFrame.create(Zcl.FrameType.GLOBAL, Zcl.Direction.SERVER_TO_CLIENT, true, null, 100, 'readRsp', 0, [{attrId: 0, attrData: 2, dataType: 32, status: 0}]);
        const frame = Zcl.ZclFrame.create(Zcl.FrameType.GLOBAL, Zcl.Direction.CLIENT_TO_SERVER, false, null, 100, 'read', 0, [{attrId: 0}]);
        const object = {type: Type.AREQ, subsystem: Subsystem.AF, command: 'incomingMsg', payload: {clusterid: 0, srcendpoint: 20, srcaddr: 2, linkquality: 101, groupid: 12, data: responseFrame.toBuffer()}};
        const response = adapter.sendZclFrameNetworkAddressWithResponse(2, 20, frame);
        znpReceived(object);

        let error;
        try {jest.runAllTimers(); await response} catch (e) {error = e;}
        expect(mockZnpRequest).toBeCalledWith(4, "dataRequest", {"clusterid": 0, "data": frame.toBuffer(), "destendpoint": 20, "dstaddr": 2, "len": 5, "options": 0, "radius": 30, "srcendpoint": 1, "transid": 1})
        expect(mockQueueExecute.mock.calls[0][1]).toBe(2);
        expect(mockZnpRequest).toBeCalledTimes(1);
        expect(error).toStrictEqual(new Error("Timeout - 2 - 20 - 100 - 11 after 15000ms"));
    });

    it('Supports backup', async () => {
        basicMocks();
        await adapter.start();
        expect(await adapter.supportsBackup()).toBeFalsy();
    });

    it('LQI', async () => {
        basicMocks();
        await adapter.start();
        mockZnpRequest.mockClear();

        const result = await adapter.lqi(203);
        expect(mockQueueExecute.mock.calls[0][1]).toBe(203);
        expect(mockZnpRequest).toBeCalledTimes(1);
        expect(mockZnpRequest).toBeCalledWith(Subsystem.ZDO, 'mgmtLqiReq', {dstaddr: 203, startindex: 0})
        expect(result).toStrictEqual({neighbors:[{linkquality:10,networkAddress:2,ieeeAddr:3, depth: 1, relationship: 3},{linkquality:15,networkAddress:3,ieeeAddr:4, depth: 5, relationship: 2}]});
    });

    it('LQI fails', async () => {
        basicMocks();
        await adapter.start();
        mockZnpRequest.mockClear();

        let error;
        try {await adapter.lqi(204)} catch (e) {error = e};
        expect(error).toStrictEqual(new Error("LQI for '204' failed"));
        expect(mockQueueExecute.mock.calls[0][1]).toBe(204);
        expect(mockZnpRequest).toBeCalledTimes(1);
        expect(mockZnpRequest).toBeCalledWith(Subsystem.ZDO, 'mgmtLqiReq', {dstaddr: 204, startindex: 0})
    });

    it('Routing table', async () => {
        basicMocks();
        await adapter.start();
        mockZnpRequest.mockClear();

        const result = await adapter.routingTable(205);
        expect(mockQueueExecute.mock.calls[0][1]).toBe(205);
        expect(mockZnpRequest).toBeCalledTimes(1);
        expect(mockZnpRequest).toBeCalledWith(Subsystem.ZDO, 'mgmtRtgReq', {dstaddr: 205, startindex: 0})
        expect(result).toStrictEqual({"table":[{"destinationAddress":10,"nextHop":3,"status":"OK"}]});
    });

    it('Routing table fails', async () => {
        basicMocks();
        await adapter.start();
        mockZnpRequest.mockClear();

        let error;
        try {await adapter.routingTable(206)} catch (e) {error = e};
        expect(error).toStrictEqual(new Error("Routing table for '206' failed"));
        expect(mockQueueExecute.mock.calls[0][1]).toBe(206);
        expect(mockZnpRequest).toBeCalledTimes(1);
        expect(mockZnpRequest).toBeCalledWith(Subsystem.ZDO, 'mgmtRtgReq', {dstaddr: 206, startindex: 0})
    });

    it('Bind endpoint', async () => {
        basicMocks();
        await adapter.start();
        mockZnpRequest.mockClear();

        const result = await adapter.bind(301, '0x01', 1, 1, '0x02', 'endpoint', 1);
        expect(mockQueueExecute.mock.calls[0][1]).toBe(301);
        expect(mockZnpRequest).toBeCalledTimes(1);
        expect(mockZnpRequest).toBeCalledWith(Subsystem.ZDO, 'bindReq', {"clusterid": 1, "dstaddr": 301, "dstaddress": "0x02", "dstaddrmode": 3, "dstendpoint": 1, "srcaddr": "0x01", "srcendpoint": 1});
    });

    it('Bind group', async () => {
        basicMocks();
        await adapter.start();
        mockZnpRequest.mockClear();

        const result = await adapter.bind(301, "0x129", 1, 1, 4, "group", null);
        expect(mockQueueExecute.mock.calls[0][1]).toBe(301);
        expect(mockZnpRequest).toBeCalledTimes(1);
        expect(mockZnpRequest).toBeCalledWith(Subsystem.ZDO, 'bindReq', {"clusterid": 1, "dstaddr": 301, "dstaddress": "0x0000000000000004", "dstaddrmode": 1, "dstendpoint": 0xFF, "srcaddr": "0x129", "srcendpoint": 1});
    });

    it('Unbind', async () => {
        basicMocks();
        await adapter.start();
        mockZnpRequest.mockClear();

        const result = await adapter.unbind(301, '0x01', 1, 1, '0x02', "endpoint", 1);
        expect(mockQueueExecute.mock.calls[0][1]).toBe(301);
        expect(mockZnpRequest).toBeCalledTimes(1);
        expect(mockZnpRequest).toBeCalledWith(Subsystem.ZDO, 'unbindReq', {"clusterid": 1, "dstaddr": 301, "dstaddress": "0x02", "dstaddrmode": 3, "dstendpoint": 1, "srcaddr": "0x01", "srcendpoint": 1});
    });

    it('Unbind group', async () => {
        basicMocks();
        await adapter.start();
        mockZnpRequest.mockClear();

        const result = await adapter.unbind(301, "0x129", 1, 1, 4, "group", null);
        expect(mockQueueExecute.mock.calls[0][1]).toBe(301);
        expect(mockZnpRequest).toBeCalledTimes(1);
        expect(mockZnpRequest).toBeCalledWith(Subsystem.ZDO, 'unbindReq', {"clusterid": 1, "dstaddr": 301, "dstaddress": "0x0000000000000004", "dstaddrmode": 1, "dstendpoint": 0xFF, "srcaddr": "0x129", "srcendpoint": 1});
    });

    it('Remove device', async () => {
        basicMocks();
        await adapter.start();
        mockZnpRequest.mockClear();

        const result = await adapter.removeDevice(401, '0x01');
        expect(mockQueueExecute.mock.calls[0][1]).toBe(401);
        expect(mockZnpRequest).toBeCalledTimes(1);
        expect(mockZnpRequest).toBeCalledWith(Subsystem.ZDO, 'mgmtLeaveReq', {"deviceaddress": "0x01", "dstaddr": 401, "removechildrenRejoin": 0});
    });

    it('Incoming message extended', async () => {
        basicMocks();
        await adapter.start();
        let zclData;
        const responseFrame = Zcl.ZclFrame.create(Zcl.FrameType.GLOBAL, Zcl.Direction.SERVER_TO_CLIENT, true, null, 100, 'readRsp', 0, [{attrId: 0, attrData: 2, dataType: 32, status: 0}]);
        const object = {type: Type.AREQ, subsystem: Subsystem.AF, command: 'incomingMsgExt', payload: {clusterid: 0, srcendpoint: 20, srcaddr: 2, linkquality: 101, groupid: 12, data: responseFrame.toBuffer()}};
        adapter.on("zclData", (p) => {zclData = p;})
        znpReceived(object);
        expect(zclData.endpoint).toStrictEqual(20);
        expect(zclData.groupID).toStrictEqual(12);
        expect(zclData.linkquality).toStrictEqual(101);
        expect(zclData.networkAddress).toStrictEqual(2);
        expect(zclData.frame).toStrictEqual(responseFrame);
    });

    it('Adapter disconnected', async () => {
        basicMocks();
        await adapter.start();
        let closeEvent = false;
        adapter.on("disconnected", () => {closeEvent = true;})
        znpClose();
        expect(closeEvent).toBeTruthy();
    });

    it('Adapter disconnected dont emit when closing', async () => {
        basicMocks();
        await adapter.start();
        await adapter.stop();
        let closeEvent = false;
        adapter.on("disconnected", () => {closeEvent = true;})
        znpClose();
        expect(closeEvent).toBeFalsy();
    });

    it('Device joined', async () => {
        basicMocks();
        await adapter.start();
        let deviceJoin;
        const object = {type: Type.AREQ, subsystem: Subsystem.ZDO, command: 'tcDeviceInd', payload: {nwkaddr: 123, extaddr: '0x123'}};
        adapter.on("deviceJoined", (p) => {deviceJoin = p;})
        znpReceived(object);
        expect(deviceJoin).toStrictEqual({ieeeAddr: '0x123', networkAddress: 123});
    });

    it('Device announce', async () => {
        basicMocks();
        await adapter.start();
        let deviceAnnounce;
        const object = {type: Type.AREQ, subsystem: Subsystem.ZDO, command: 'endDeviceAnnceInd', payload: {nwkaddr: 123, ieeeaddr: '0x123'}};
        adapter.on("deviceAnnounce", (p) => {deviceAnnounce = p;})
        znpReceived(object);
        expect(deviceAnnounce).toStrictEqual({ieeeAddr: '0x123', networkAddress: 123});
    });

    it('Device leave', async () => {
        basicMocks();
        await adapter.start();
        let deviceAnnounce;
        const object = {type: Type.AREQ, subsystem: Subsystem.ZDO, command: 'leaveInd', payload: {srcaddr: 123, extaddr: '0x123'}};
        adapter.on("deviceLeave", (p) => {deviceAnnounce = p;})
        znpReceived(object);
        expect(deviceAnnounce).toStrictEqual({ieeeAddr: '0x123', networkAddress: 123});
    });

    it('Do nothing wiht non areq event', async () => {
        basicMocks();
        await adapter.start();
        let deviceAnnounce;
        const object = {type: Type.SREQ, subsystem: Subsystem.ZDO, command: 'leaveInd', payload: {srcaddr: 123, extaddr: '0x123'}};
        adapter.on("deviceLeave", (p) => {deviceAnnounce = p;})
        znpReceived(object);
        expect(deviceAnnounce).toStrictEqual(undefined);
    });

    it('Get network parameters', async () => {
        basicMocks();
        await adapter.start();
        mockZnpRequest.mockClear();
        const result = await adapter.getNetworkParameters();
        expect(mockZnpRequest).toBeCalledTimes(1);
        expect(mockZnpRequest).toBeCalledWith(Subsystem.ZDO, 'extNwkInfo', {});
        expect(result).toStrictEqual({channel: 12, extendedPanID: 10, panID: 20});
    });
});