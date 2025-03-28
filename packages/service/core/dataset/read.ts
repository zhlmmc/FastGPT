import { BucketNameEnum } from '@fastgpt/global/common/file/constants';
import { DatasetSourceReadTypeEnum } from '@fastgpt/global/core/dataset/constants';
import { readFileContentFromMongo } from '../../common/file/gridfs/controller';
import { urlsFetch } from '../../common/string/cheerio';
import { parseCsvTable2Chunks } from './training/utils';
import { TextSplitProps, splitText2Chunks } from '@fastgpt/global/common/string/textSplitter';
import axios from 'axios';
import { readRawContentByFileBuffer } from '../../common/file/read/utils';
import { parseFileExtensionFromUrl } from '@fastgpt/global/common/string/tools';
import { APIFileServer, FeishuServer, YuqueServer } from '@fastgpt/global/core/dataset/apiDataset';
import { useApiDatasetRequest } from './apiDataset/api';
import { POST } from '../../common/api/plusRequest';

export const readFileRawTextByUrl = async ({
  teamId,
  tmbId,
  url,
  customPdfParse,
  relatedId
}: {
  teamId: string;
  tmbId: string;
  url: string;
  customPdfParse?: boolean;
  relatedId: string; // externalFileId / apiFileId
}) => {
  const response = await axios({
    method: 'get',
    url: url,
    responseType: 'arraybuffer'
  });
  const extension = parseFileExtensionFromUrl(url);

  const buffer = Buffer.from(response.data, 'binary');

  const { rawText } = await readRawContentByFileBuffer({
    customPdfParse,
    isQAImport: false,
    extension,
    teamId,
    tmbId,
    buffer,
    encoding: 'utf-8',
    metadata: {
      relatedId
    }
  });

  return rawText;
};

/* 
  fileId - local file, read from mongo
  link - request
  externalFile/apiFile = request read
*/
export const readDatasetSourceRawText = async ({
  teamId,
  tmbId,
  type,
  sourceId,
  isQAImport,
  selector,
  externalFileId,
  apiServer,
  feishuServer,
  yuqueServer,
  customPdfParse
}: {
  teamId: string;
  tmbId: string;
  type: DatasetSourceReadTypeEnum;
  sourceId: string;
  customPdfParse?: boolean;

  isQAImport?: boolean; // csv data
  selector?: string; // link selector
  externalFileId?: string; // external file dataset
  apiServer?: APIFileServer; // api dataset
  feishuServer?: FeishuServer; // feishu dataset
  yuqueServer?: YuqueServer; // yuque dataset
}): Promise<string> => {
  if (type === DatasetSourceReadTypeEnum.fileLocal) {
    const { rawText } = await readFileContentFromMongo({
      teamId,
      tmbId,
      bucketName: BucketNameEnum.dataset,
      fileId: sourceId,
      isQAImport,
      customPdfParse
    });
    return rawText;
  } else if (type === DatasetSourceReadTypeEnum.link) {
    const result = await urlsFetch({
      urlList: [sourceId],
      selector
    });

    return result[0]?.content || '';
  } else if (type === DatasetSourceReadTypeEnum.externalFile) {
    if (!externalFileId) return Promise.reject('FileId not found');
    const rawText = await readFileRawTextByUrl({
      teamId,
      tmbId,
      url: sourceId,
      relatedId: externalFileId,
      customPdfParse
    });
    return rawText;
  } else if (type === DatasetSourceReadTypeEnum.apiFile) {
    const rawText = await readApiServerFileContent({
      apiServer,
      feishuServer,
      yuqueServer,
      apiFileId: sourceId,
      teamId,
      tmbId
    });
    return rawText;
  }
  return '';
};

export const readApiServerFileContent = async ({
  apiServer,
  feishuServer,
  yuqueServer,
  apiFileId,
  teamId,
  tmbId,
  customPdfParse
}: {
  apiServer?: APIFileServer;
  feishuServer?: FeishuServer;
  yuqueServer?: YuqueServer;
  apiFileId: string;
  teamId: string;
  tmbId: string;
  customPdfParse?: boolean;
}) => {
  if (apiServer) {
    return useApiDatasetRequest({ apiServer }).getFileContent({
      teamId,
      tmbId,
      apiFileId,
      customPdfParse
    });
  }

  if (feishuServer || yuqueServer) {
    return POST<string>(`/core/dataset/systemApiDataset`, {
      type: 'content',
      feishuServer,
      yuqueServer,
      apiFileId
    });
  }

  return Promise.reject('No apiServer or feishuServer or yuqueServer');
};

export const rawText2Chunks = ({
  rawText,
  isQAImport,
  chunkLen = 512,
  ...splitProps
}: {
  rawText: string;
  isQAImport?: boolean;
} & TextSplitProps) => {
  if (isQAImport) {
    const { chunks } = parseCsvTable2Chunks(rawText);
    return chunks;
  }

  const { chunks } = splitText2Chunks({
    text: rawText,
    chunkLen,
    ...splitProps
  });

  return chunks.map((item) => ({
    q: item,
    a: ''
  }));
};
