/**
 * Browser-native, zero-dependency Binary EXIF & TIFF Parser for Meteorological Photo Forensics.
 * Complies with ISO 12234-2 / CIPA DC-008-2016 EXIF Standard.
 */

export interface ParsedExifResult {
  hasExif: boolean;
  cameraMake?: string;
  cameraModel?: string;
  captureTimestamp?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  isWithinIndia?: boolean;
  isStale?: boolean;
  captureAgeHours?: number;
  error?: string;
}

/**
 * Parses an image File or Blob and extracts real hardware camera model, capture timestamp, and GPS tags.
 */
export async function parseImageExif(file: File | Blob): Promise<ParsedExifResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        if (!buffer || buffer.byteLength < 32) {
          return resolve({ hasExif: false });
        }

        const dataView = new DataView(buffer);

        // Check JPEG SOI (0xFFD8)
        if (dataView.getUint16(0, false) !== 0xFFD8) {
          return resolve({ hasExif: false });
        }

        let offset = 2;
        const length = dataView.byteLength;

        while (offset < length - 4) {
          const marker = dataView.getUint16(offset, false);
          offset += 2;

          // APP1 Marker (0xFFE1) contains EXIF
          if (marker === 0xFFE1) {
            const exifLength = dataView.getUint16(offset, false);
            offset += 2;

            // Check "Exif\0\0" header (0x45786966 0000)
            const header = String.fromCharCode(
              dataView.getUint8(offset),
              dataView.getUint8(offset + 1),
              dataView.getUint8(offset + 2),
              dataView.getUint8(offset + 3)
            );

            if (header === 'Exif') {
              const tiffOffset = offset + 6;
              const result = parseTiffHeader(dataView, tiffOffset);
              return resolve(result);
            } else {
              offset += exifLength - 2;
            }
          } else if ((marker & 0xFF00) === 0xFF00) {
            // Skip other JPEG markers
            const sectionLength = dataView.getUint16(offset, false);
            offset += sectionLength;
          } else {
            break;
          }
        }

        resolve({ hasExif: false });
      } catch (err: any) {
        resolve({ hasExif: false, error: err.message });
      }
    };

    reader.onerror = () => resolve({ hasExif: false, error: 'FileReader error' });
    reader.readAsArrayBuffer(file);
  });
}

function parseTiffHeader(dataView: DataView, tiffStart: number): ParsedExifResult {
  // Byte order: 0x4949 ('II' Little Endian) or 0x4D4D ('MM' Big Endian)
  const byteOrderMarker = dataView.getUint16(tiffStart, false);
  const isLittleEndian = byteOrderMarker === 0x4949;

  // Verify TIFF 42 marker
  const fortyTwo = dataView.getUint16(tiffStart + 2, isLittleEndian);
  if (fortyTwo !== 42) {
    return { hasExif: false };
  }

  const firstIFDOffset = dataView.getUint32(tiffStart + 4, isLittleEndian);
  let ifdOffset = tiffStart + firstIFDOffset;

  let cameraMake: string | undefined;
  let cameraModel: string | undefined;
  let dateTimeStr: string | undefined;
  let gpsOffset: number | undefined;
  let exifSubIFDOffset: number | undefined;

  const entriesCount = dataView.getUint16(ifdOffset, isLittleEndian);
  ifdOffset += 2;

  for (let i = 0; i < entriesCount; i++) {
    const entryOffset = ifdOffset + i * 12;
    const tag = dataView.getUint16(entryOffset, isLittleEndian);

    if (tag === 0x010F) {
      // Make
      cameraMake = readStringTag(dataView, tiffStart, entryOffset, isLittleEndian);
    } else if (tag === 0x0110) {
      // Model
      cameraModel = readStringTag(dataView, tiffStart, entryOffset, isLittleEndian);
    } else if (tag === 0x0132) {
      // DateTime
      dateTimeStr = readStringTag(dataView, tiffStart, entryOffset, isLittleEndian);
    } else if (tag === 0x8769) {
      // Exif SubIFD Offset
      exifSubIFDOffset = dataView.getUint32(entryOffset + 8, isLittleEndian);
    } else if (tag === 0x8825) {
      // GPS Info IFD Offset
      gpsOffset = dataView.getUint32(entryOffset + 8, isLittleEndian);
    }
  }

  // If DateTime not in IFD0, check Exif SubIFD (tag 0x9003 = DateTimeOriginal)
  if (!dateTimeStr && exifSubIFDOffset) {
    const subIfdStart = tiffStart + exifSubIFDOffset;
    const subCount = dataView.getUint16(subIfdStart, isLittleEndian);
    for (let j = 0; j < subCount; j++) {
      const subEntry = subIfdStart + 2 + j * 12;
      const subTag = dataView.getUint16(subEntry, isLittleEndian);
      if (subTag === 0x9003 || subTag === 0x9004) {
        dateTimeStr = readStringTag(dataView, tiffStart, subEntry, isLittleEndian);
        break;
      }
    }
  }

  // Parse GPS Info IFD if present
  let gpsLatitude: number | undefined;
  let gpsLongitude: number | undefined;

  if (gpsOffset) {
    const gpsStart = tiffStart + gpsOffset;
    const gpsEntriesCount = dataView.getUint16(gpsStart, isLittleEndian);
    let latRef = 'N';
    let lonRef = 'E';
    let latDMS: number[] | undefined;
    let lonDMS: number[] | undefined;

    for (let k = 0; k < gpsEntriesCount; k++) {
      const gpsEntry = gpsStart + 2 + k * 12;
      const tag = dataView.getUint16(gpsEntry, isLittleEndian);

      if (tag === 0x0001) {
        // Latitude Ref ('N' or 'S')
        latRef = String.fromCharCode(dataView.getUint8(gpsEntry + 8));
      } else if (tag === 0x0002) {
        // Latitude DMS
        latDMS = readRationalArray(dataView, tiffStart, gpsEntry, 3, isLittleEndian);
      } else if (tag === 0x0003) {
        // Longitude Ref ('E' or 'W')
        lonRef = String.fromCharCode(dataView.getUint8(gpsEntry + 8));
      } else if (tag === 0x0004) {
        // Longitude DMS
        lonDMS = readRationalArray(dataView, tiffStart, gpsEntry, 3, isLittleEndian);
      }
    }

    if (latDMS && latDMS.length === 3) {
      const deg = latDMS[0] + latDMS[1] / 60 + latDMS[2] / 3600;
      gpsLatitude = latRef === 'S' ? -deg : deg;
    }

    if (lonDMS && lonDMS.length === 3) {
      const deg = lonDMS[0] + lonDMS[1] / 60 + lonDMS[2] / 3600;
      gpsLongitude = lonRef === 'W' ? -deg : deg;
    }
  }

  // Parse ISO Capture Timestamp
  let captureTimestamp: string | undefined;
  let isStale = false;
  let captureAgeHours: number | undefined;

  if (dateTimeStr) {
    // Format is typically "YYYY:MM:DD HH:MM:SS"
    const parts = dateTimeStr.trim().split(' ');
    if (parts.length === 2) {
      const datePart = parts[0].replace(/:/g, '-');
      const timePart = parts[1];
      const isoCandidate = `${datePart}T${timePart}Z`;
      const parsedTime = Date.parse(isoCandidate);
      if (!isNaN(parsedTime)) {
        captureTimestamp = new Date(parsedTime).toISOString();
        captureAgeHours = (Date.now() - parsedTime) / (1000 * 3600);
        if (captureAgeHours > 72) {
          isStale = true;
        }
      }
    }
  }

  // Geographic Territorial Verification (India bounding box: 5°N-38°N, 67°E-99°E)
  let isWithinIndia: boolean | undefined;
  if (gpsLatitude !== undefined && gpsLongitude !== undefined) {
    isWithinIndia = (
      gpsLatitude >= 5.0 && gpsLatitude <= 38.0 &&
      gpsLongitude >= 67.0 && gpsLongitude <= 99.0
    );
  }

  const modelCombined = cameraMake && cameraModel 
    ? `${cameraMake} ${cameraModel}`.trim() 
    : cameraModel || cameraMake;

  return {
    hasExif: true,
    cameraMake,
    cameraModel: modelCombined,
    captureTimestamp,
    gpsLatitude,
    gpsLongitude,
    isWithinIndia,
    isStale,
    captureAgeHours: captureAgeHours ? Math.round(captureAgeHours) : undefined
  };
}

function readStringTag(dataView: DataView, tiffStart: number, entryOffset: number, isLittleEndian: boolean): string {
  const count = dataView.getUint32(entryOffset + 4, isLittleEndian);
  let valueOffset = dataView.getUint32(entryOffset + 8, isLittleEndian);
  if (count <= 4) {
    valueOffset = entryOffset + 8;
  } else {
    valueOffset = tiffStart + valueOffset;
  }

  let str = '';
  for (let i = 0; i < count - 1; i++) {
    const charCode = dataView.getUint8(valueOffset + i);
    if (charCode === 0) break;
    str += String.fromCharCode(charCode);
  }
  return str.trim();
}

function readRationalArray(dataView: DataView, tiffStart: number, entryOffset: number, count: number, isLittleEndian: boolean): number[] {
  const valueOffset = tiffStart + dataView.getUint32(entryOffset + 8, isLittleEndian);
  const result: number[] = [];
  for (let i = 0; i < count; i++) {
    const numerator = dataView.getUint32(valueOffset + i * 8, isLittleEndian);
    const denominator = dataView.getUint32(valueOffset + i * 8 + 4, isLittleEndian);
    result.push(denominator === 0 ? 0 : numerator / denominator);
  }
  return result;
}
