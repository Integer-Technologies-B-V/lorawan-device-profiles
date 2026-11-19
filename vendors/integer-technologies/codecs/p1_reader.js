/**
 * ChirpStack v4 Payload Codec for Integer Technologies LoRa_P1Board
 * Decodes the 48-byte binary uplink payload on FPort = 1.
 */
function decodeUplink(input) {
  if (input.fPort !== 1) {
    return {
      errors: ["Unsupported FPort: " + input.fPort + " (expected 1)"],
    };
  }
  if (!input.bytes || input.bytes.length < 48) {
    return {
      errors: [
        "Invalid payload length: " +
          (input.bytes ? input.bytes.length : 0) +
          " bytes (expected 48)",
      ],
    };
  }

  var b = input.bytes;

  function u16(offset) {
    return (b[offset] | (b[offset + 1] << 8)) >>> 0;
  }

  function i16(offset) {
    var val = u16(offset);
    return val & 0x8000 ? val - 0x10000 : val;
  }

  function u32(offset) {
    return (
      (b[offset] |
        (b[offset + 1] << 8) |
        (b[offset + 2] << 16) |
        (b[offset + 3] << 24)) >>>
      0
    );
  }

  var flags = b[0];
  var tariff = flags & 0x03;
  var voltagePresent = Boolean((flags >> 2) & 0x01);
  var qualityPresent = Boolean((flags >> 3) & 0x01);
  var dstActive = Boolean((flags >> 4) & 0x01);
  var threePhase = Boolean((flags >> 5) & 0x01);
  var mbusTypeIdx = (flags >> 6) & 0x03;
  var mbusTypes = ["none", "gas", "water", "thermal"];
  var mbusType = mbusTypes[mbusTypeIdx];

  return {
    data: {
      /* Status & Meter Capabilities */
      tariff: tariff,
      dst_active: dstActive,
      three_phase: threePhase,
      voltage_present: voltagePresent,
      quality_present: qualityPresent,
      mbus_type: mbusType,
      meter_timestamp: u32(1),

      /* Cumulative Electricity Registers (kWh, 0.001 kWh resolution) */
      energy_delivered_t1_kwh: u32(5) / 1000.0,
      energy_delivered_t2_kwh: u32(9) / 1000.0,
      energy_returned_t1_kwh: u32(13) / 1000.0,
      energy_returned_t2_kwh: u32(17) / 1000.0,

      /* 2-Minute Mean Active Power (kW, 0.001 kW = 1 W resolution) */
      power_delivered_kw: u16(21) / 1000.0,
      power_returned_kw: u16(23) / 1000.0,
      power_net_l1_kw: i16(25) / 1000.0,
      power_net_l2_kw: threePhase ? i16(27) / 1000.0 : null,
      power_net_l3_kw: threePhase ? i16(29) / 1000.0 : null,

      /* 2-Minute Mean Phase Voltage (V, 0.1 V resolution) */
      voltage_l1_v: voltagePresent ? u16(31) / 10.0 : null,
      voltage_l2_v: voltagePresent && threePhase ? u16(33) / 10.0 : null,
      voltage_l3_v: voltagePresent && threePhase ? u16(35) / 10.0 : null,

      /* 2-Minute Mean Phase Current (A, 1 A resolution) */
      current_l1_a: b[37],
      current_l2_a: threePhase ? b[38] : null,
      current_l3_a: threePhase ? b[39] : null,

      /* Cumulative M-Bus Reading (m3 for gas/water, GJ for thermal) */
      mbus_reading: mbusTypeIdx !== 0 ? u32(40) / 1000.0 : null,

      /* Cumulative Power Quality Counters */
      power_failures_short: qualityPresent ? b[44] : null,
      power_failures_long: qualityPresent ? b[45] : null,
      voltage_sags_total: qualityPresent ? b[46] : null,
      voltage_swells_total: qualityPresent ? b[47] : null,
    },
  };
}