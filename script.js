if (!NDEFReader) {
  pre.innerHTML += `<font color="red">Error: ${error}</font>\n`;
}

function preStringData(data, indent) {
  pre.innerHTML +=`${indent}> <font color='green'>${data}</font>\n`;
}

function preBufferSourceData(record, indent) {
  switch (record.data.byteLength) {
    // recordType is :act and data is new Uint8Array([3])
    case 1:
    // ArrayBufferView [2, 3, 4]
    case 3:
    // ArrayBuffer [1, 2, 3, 4] or recordType is :s and data is new Uint32Array([4096])
    case 4:
      let data = "";
      if (record.recordType == ":s") {
        data = new Uint32Array(record.data.buffer);
      } else {
        data = new Uint8Array(record.data.buffer);
      }
      preStringData(`BufferSource data: ${data.toString()}`, indent);
      break;
    // recordType is :t and data is image/png
    case 9:
    // JSON: { key1: "value1" }
    case 17:
      const decoder = new TextDecoder();
      if (record.recordType == ":t") {
        preStringData(`MIME type: ${decoder.decode(record.data)}`, indent);
      } else {
        preStringData(`Json data: ${decoder.decode(record.data)}`, indent);
      }
      break;
    default:
      const blob = new Blob([record.data], {type: "application/octet-stream"});

      const img = document.createElement("img");
      img.src = URL.createObjectURL(blob);
      img.style.paddingLeft = "15px";

      pre.innerHTML += `${indent}> <font color='green'>Image data:</font>\n`;
      pre.appendChild(img);

      const br = document.createElement("br");
      pre.appendChild(br);
  }
}

function preNDEFMessageInitData(record, indent) {
  pre.innerHTML += `<br>${indent}> <font color='green'>Records:</font>\n`;
  for (const embeddedRecord of record.toRecords()) {
    preRecord(embeddedRecord, `${indent}  `);
  }
}

function preRecord(record, indent="  ") {
  pre.innerHTML += `<br>${indent}> <font color='green'>recordType: ${record.recordType}</font>\n`
                + `${indent}> <font color='green'>mediaType: ${record.mediaType}</font>\n`
                + `${indent}> <font color='green'>id: ${record.id}</font>\n`
                + `${indent}> <font color='green'>encoding: ${record.encoding}</font>\n`
                + `${indent}> <font color='green'>lang: ${record.lang}</font>\n`;
  switch (record.recordType) {
    case "empty":
      preStringData(`data: ${record.data}`, indent);
      break;
    case "url":
    case "absolute-url":
      const decoder = new TextDecoder();
      preStringData(`data: ${decoder.decode(record.data)}`, indent);
      break;
    case "text":
      if (record.data.byteLength == 5) {
        const textDecoder = new TextDecoder(record.encoding);
        preStringData(`data: ${textDecoder.decode(record.data)}`, indent);
      } else {
        preBufferSourceData(record, indent);
      }
      break;
    case "mime":
    case "unknown":
      preBufferSourceData(record, indent);
      break;
    case "smart-poster":
      preNDEFMessageInitData(record, indent);
      break;
    default:
      if (record.toRecords() == null) {
        preBufferSourceData(record, indent);
      } else {
        preNDEFMessageInitData(record, indent);
      }
  }
}


const r = new NDEFReader();

r.onerror = event => {
  pre.innerHTML += `<font color='red'>Error: ${event.name}: ${event.message}</font>\n`;
};

r.onreading = ({ message }) => {
  pre.innerHTML += `<br>> <font color='green'>Reading from ${event.serialNumber}</font>\n`
                + `> <font color='green'>Records:</font>\n`;

  if (message.records.length === 0) {
    pre.innerHTML += `  > <font color='green'>No WebNFC records</font>\n`;
    return;
  }

  for (const record of message.records) {
    preRecord(record);
  }
};

/* Scan signal */
const abortController = new AbortController();
abortController.signal.addEventListener("abort", _ => {
  pre.innerHTML += "> <font color='green'>Scan operation aborted.</font>\n";
});
pre.innerHTML += `<b>Note: Click "scan" button to start reading.</b>\n`;

abortButton.addEventListener("click", _ => {
  abortController.abort();
});

scanButton.addEventListener("click", async _ => {
  pre.innerHTML += "<b>Start scanning...</b>\n";
  const scanFilterId = scanId.value === "" ? undefined : scanId.value;
  const scanFilterMediaType = mediaType.value === "" ? undefined : mediaType.value;
  if (recordType.value === "---") {
    await r.scan({
      signal: abortController.signal,
      id: scanFilterId,
      mediaType: scanFilterMediaType
    });
  } else {
    await r.scan({
      signal: abortController.signal,
      id: scanFilterId,
      recordType: recordType.value,
      mediaType: scanFilterMediaType
    });
  }
});

/* Write signal */
const abortWriteController = new AbortController();
abortWriteController.signal.addEventListener("abort", _ => {
  pre.innerHTML += "> <font color='green'>Write operation aborted.</font>\n";
});

abortWriteButton.addEventListener("click", _ => {
  abortWriteController.abort();
});

const str_hello = "hello";
/* Write Message */
let newMessage = str_hello;
writeMessage.value = newMessage;

NDEFMessageInit.style.display="none";

// JSON ArrayBufferView
const encoder = new TextEncoder();
const test_json_data = encoder.encode(JSON.stringify({ key1: "value1" }));
// ArrayBuffer
const buffer = new ArrayBuffer(4);
new Uint8Array(buffer).set([1, 2, 3, 4]);
// ArrayBufferView
const buffer_view = new Uint8Array(buffer, 1);
// Image ArrayBuffer
const image = async () => {
  const response = await fetch("./red.png");
  const image_buffer_data = await response.arrayBuffer();
  return image_buffer_data;
}
// DOMString
const msg_dom_string = str_hello;
// text from DOMString
const msg_text_dom_string = { records: [{ recordType: "text",
  data: msg_dom_string, id: "http://www.intel.com" }] };
// text from BufferSource
const msg_text_buffersource = { records: [{ recordType: "text",
  data: buffer_view, id: "http://www.intel.com" }] };
// empty
const msg_empty = { records: [{ recordType: "empty" }] };
// url
const msg_url = { records: [{ recordType: "url",
  data: "http://www.intel.com", id: "http://www.intel.com" }] };
// absolute-url
const msg_absolute_url = { records: [{ recordType: "absolute-url",
  data: "http://www.intel.com/web-nfc/", id: "http://www.intel.com" }] };
// mime from json
const msg_mime_from_json = { records: [{ recordType: "mime", data: test_json_data,
  mediaType: "application/json", id: "http://www.intel.com" }] };
// mime
const msg_mime = { records: [{ recordType: "mime", data: buffer_view,
  mediaType: "application/octet-stream", id: "http://www.intel.com" }] };
// unknown
const msg_unknown = async () => {
  return { records: [{ recordType: "unknown", data: await image(),
  id: "http://www.intel.com" }] };
}
// external type from NDEFMessage
const msg_external_type_from_ndefmessage = { records: [
    {
      recordType: "a.b:a",
      data: {
        records: [
          {
            recordType: "url",
            data: "https:/a.b/21",
            id: "https://w3c.a.io/2"
          },
          {
            recordType: "absolute-url",
            data: "https://a.b/22"
          },
          {
            recordType: "empty"
          },
          {
            recordType: "text",
            data: msg_dom_string
          },
          {
            recordType: "unknown",
            data: buffer_view
          },
          {
            recordType: "mime",
            mediaType: "application/json",
            data: test_json_data
          },
          {
            recordType: "mime",
            mediaType: "application/octet-stream",
            data: buffer_view
          },
          {
            recordType: "a.b:b",
            data: buffer_view
          },
          {
            recordType: "a.b:c",
            data: {
              records: [
                {
                  recordType: "text",
                  data: msg_dom_string
                }
              ]
            }
          }
        ]
      }
    }
  ]};
// external type from BufferSource
const msg_external_type_from_buffer_source = async () => {
  return { records: [{ recordType: "w3.org:abc",
  data: await image(), id: "http://www.intel.com" }] };
}
// local type
const msg_local_type = async () => {
  return { records: [
    {
      recordType: "a.b:c",
      data: { records: [
        {
          recordType: ":a",
          data: { records: [
            {
              recordType: ":abb",
              data: buffer
            },
            {
              recordType: ":abc",
              data: buffer_view
            },
            {
              recordType: ":abe",
              data: test_json_data
            },
            {
              recordType: ":abd",
              data: await image()
            }
          ]}
        }
      ]}
    }
  ]}
}
// smart-poster
const msg_smart_poster = async () => {
  return { records: [
    {
      recordType: "smart-poster",
      data: {
        records: [
          {
            recordType: "url",
            data: "https:/a.b/21"
          },
          {
            recordType: "text",
            data: msg_dom_string
          },
          {
            recordType: ":t",
            data: encoder.encode("image/png")
          },
          {
            recordType: ":s",
            data: new Uint32Array([4096])
          },
          {
            recordType: ":act",
            data: new Uint8Array([3])
          },
          {
            recordType: "mime",
            mediaType: "image/png",
            data: await image()
          }
        ]
      }
    }
  ]}
};
NDEFMessageSource.onchange = async () => {
  writeMessage.disabled = true;
  NDEFMessageInit.style.display = "none";
  switch (NDEFMessageSource.value) {
    case "DOMString":
      newMessage = msg_dom_string;
      writeMessage.value = newMessage;
      break;
    case "BufferSource":
      newMessage = buffer;
      const val = new Uint8Array(newMessage);
      writeMessage.value = val.toString();
      break;
    case "NDEFMessageInit":
      writeRecordType.value = "text from DOMString";
      newMessage = msg_text_dom_string;
      NDEFMessageInit.style.display = "";
      writeMessage.value = JSON.stringify(newMessage);
      break;
  }
}

writeRecordType.onchange = async () => {
  writeMessage.disabled = true;
  switch (writeRecordType.value) {
    case "empty":
      newMessage = msg_empty;
      //writeMessage.disabled = false;
      break;
    case "text from DOMString":
      newMessage = msg_text_dom_string;
      //writeMessage.disabled = false;
      break;
    case "text from BufferSource":
      newMessage = msg_text_buffersource;
      //writeMessage.disabled = false;
      break;
    case "url":
      newMessage = msg_url;
      //writeMessage.disabled = false;
      break;
    case "absolute-url":
      newMessage = msg_absolute_url;
      //writeMessage.disabled = false;
      break;
    case "mime from json":
      newMessage = msg_mime_from_json;
      break;
    case "mime":
      newMessage = msg_mime;
      break;
    case "unknown":
      newMessage = await msg_unknown();
      break;
    case "external type from NDEFMessage":
      newMessage = msg_external_type_from_ndefmessage;
      break;
    case "external type from BufferSource":
      newMessage = await msg_external_type_from_buffer_source();
      break;
    case "local type":
      newMessage = await msg_local_type();
      break;
    case "smart-poster":
      newMessage = await msg_smart_poster();
      break;
  }
  writeMessage.value = JSON.stringify(newMessage);
}

/* Write */

writeButton.addEventListener("click", async _ => {
  pre.innerHTML += "<b>Start writing...</b>\n";
  const w = new NDEFWriter();
  //newMessage = JSON.parse(writeMessage.value);
  try {
    await w.write(
      newMessage,
      {
        ignoreRead: ignoreRead.value === "false" ? false : true,
        overwrite: overwrite.value === "false" ? false : true,
        signal: abortWriteController.signal
      }
    );
    pre.innerHTML += "> <font color='green'>Writing data successfully.</font>\n";
  } catch(e) {
    pre.innerHTML += `> <font color='red'>${e}</font>\n`;
  }
});

