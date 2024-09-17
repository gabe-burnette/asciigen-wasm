const std = @import("std");

const font_bitmap: [128][8]u8 = .{
    .{ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 }, // U+0000 (null)
    .{ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 }, // U+0001
    .{ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 }, // U+0002
    .{ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 }, // U+0003
    .{ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 }, // U+0004
    .{ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 }, // U+0005
    .{ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 }, // U+0006
    .{ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 }, // U+0007
    .{ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 }, // U+0008
    .{ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 }, // U+0009
    .{ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 }, // U+000A
    .{ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 }, // U+000B
    .{ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 }, // U+000C
    .{ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 }, // U+000D
    .{ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 }, // U+000E
    .{ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 }, // U+000F
    .{ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 }, // U+0010
    .{ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 }, // U+0011
    .{ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 }, // U+0012
    .{ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 }, // U+0013
    .{ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 }, // U+0014
    .{ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 }, // U+0015
    .{ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 }, // U+0016
    .{ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 }, // U+0017
    .{ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 }, // U+0018
    .{ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 }, // U+0019
    .{ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 }, // U+001A
    .{ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 }, // U+001B
    .{ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 }, // U+001C
    .{ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 }, // U+001D
    .{ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 }, // U+001E
    .{ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 }, // U+001F
    .{ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 }, // U+0020 (space)
    .{ 0x18, 0x3C, 0x3C, 0x18, 0x18, 0x00, 0x18, 0x00 }, // U+0021 (!)
    .{ 0x6C, 0x6C, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 }, // U+0022 (")
    .{ 0x6C, 0x6C, 0xFE, 0x6C, 0xFE, 0x6C, 0x6C, 0x00 }, // U+0023 (#)
    .{ 0x30, 0x7C, 0xC0, 0x78, 0x0C, 0xF8, 0x30, 0x00 }, // U+0024 ($)
    .{ 0x00, 0xC6, 0xCC, 0x18, 0x30, 0x66, 0xC6, 0x00 }, // U+0025 (%)
    .{ 0x38, 0x6C, 0x38, 0x76, 0xDC, 0xCC, 0x76, 0x00 }, // U+0026 (&)
    .{ 0x60, 0x60, 0xC0, 0x00, 0x00, 0x00, 0x00, 0x00 }, // U+0027 (')
    .{ 0x18, 0x30, 0x60, 0x60, 0x60, 0x30, 0x18, 0x00 }, // U+0028 (()
    .{ 0x60, 0x30, 0x18, 0x18, 0x18, 0x30, 0x60, 0x00 }, // U+0029 ())
    .{ 0x00, 0x66, 0x3C, 0xFF, 0x3C, 0x66, 0x00, 0x00 }, // U+002A (*)
    .{ 0x00, 0x30, 0x30, 0xFC, 0x30, 0x30, 0x00, 0x00 }, // U+002B (+)
    .{ 0x00, 0x00, 0x00, 0x00, 0x00, 0x30, 0x30, 0x60 }, // U+002C (,)
    .{ 0x00, 0x00, 0x00, 0xFC, 0x00, 0x00, 0x00, 0x00 }, // U+002D (-)
    .{ 0x00, 0x00, 0x00, 0x00, 0x00, 0x30, 0x30, 0x00 }, // U+002E (.)
    .{ 0x06, 0x0C, 0x18, 0x30, 0x60, 0xC0, 0x80, 0x00 }, // U+002F (/)
    .{ 0x7C, 0xC6, 0xCE, 0xDE, 0xF6, 0xE6, 0x7C, 0x00 }, // U+0030 (0)
    .{ 0x30, 0x70, 0x30, 0x30, 0x30, 0x30, 0xFC, 0x00 }, // U+0031 (1)
    .{ 0x78, 0xCC, 0x0C, 0x38, 0x60, 0xCC, 0xFC, 0x00 }, // U+0032 (2)
    .{ 0x78, 0xCC, 0x0C, 0x38, 0x0C, 0xCC, 0x78, 0x00 }, // U+0033 (3)
    .{ 0x1C, 0x3C, 0x6C, 0xCC, 0xFE, 0x0C, 0x1E, 0x00 }, // U+0034 (4)
    .{ 0xFC, 0xC0, 0xF8, 0x0C, 0x0C, 0xCC, 0x78, 0x00 }, // U+0035 (5)
    .{ 0x38, 0x60, 0xC0, 0xF8, 0xCC, 0xCC, 0x78, 0x00 }, // U+0036 (6)
    .{ 0xFC, 0xCC, 0x0C, 0x18, 0x30, 0x30, 0x30, 0x00 }, // U+0037 (7)
    .{ 0x78, 0xCC, 0xCC, 0x78, 0xCC, 0xCC, 0x78, 0x00 }, // U+0038 (8)
    .{ 0x78, 0xCC, 0xCC, 0x7C, 0x0C, 0x18, 0x70, 0x00 }, // U+0039 (9)
    .{ 0x00, 0x30, 0x30, 0x00, 0x00, 0x30, 0x30, 0x00 }, // U+003A (:)
    .{ 0x00, 0x30, 0x30, 0x00, 0x00, 0x30, 0x30, 0x60 }, // U+003B (;)
    .{ 0x18, 0x30, 0x60, 0xC0, 0x60, 0x30, 0x18, 0x00 }, // U+003C (<)
    .{ 0x00, 0x00, 0xFC, 0x00, 0x00, 0xFC, 0x00, 0x00 }, // U+003D (=)
    .{ 0x60, 0x30, 0x18, 0x0C, 0x18, 0x30, 0x60, 0x00 }, // U+003E (>)
    .{ 0x78, 0xCC, 0x0C, 0x18, 0x30, 0x00, 0x30, 0x00 }, // U+003F (?)
    .{ 0x7C, 0xC6, 0xDE, 0xDE, 0xDE, 0xC0, 0x78, 0x00 }, // U+0040 (@)
    .{ 0x30, 0x78, 0xCC, 0xCC, 0xFC, 0xCC, 0xCC, 0x00 }, // U+0041 (A)
    .{ 0xFC, 0x66, 0x66, 0x7C, 0x66, 0x66, 0xFC, 0x00 }, // U+0042 (B)
    .{ 0x3C, 0x66, 0xC0, 0xC0, 0xC0, 0x66, 0x3C, 0x00 }, // U+0043 (C)
    .{ 0xF8, 0x6C, 0x66, 0x66, 0x66, 0x6C, 0xF8, 0x00 }, // U+0044 (D)
    .{ 0xFE, 0x62, 0x68, 0x78, 0x68, 0x62, 0xFE, 0x00 }, // U+0045 (E)
    .{ 0xFE, 0x62, 0x68, 0x78, 0x68, 0x60, 0xF0, 0x00 }, // U+0046 (F)
    .{ 0x3C, 0x66, 0xC0, 0xC0, 0xCE, 0x66, 0x3E, 0x00 }, // U+0047 (G)
    .{ 0xCC, 0xCC, 0xCC, 0xFC, 0xCC, 0xCC, 0xCC, 0x00 }, // U+0048 (H)
    .{ 0x78, 0x30, 0x30, 0x30, 0x30, 0x30, 0x78, 0x00 }, // U+0049 (I)
    .{ 0x1E, 0x0C, 0x0C, 0x0C, 0xCC, 0xCC, 0x78, 0x00 }, // U+004A (J)
    .{ 0xE6, 0x66, 0x6C, 0x78, 0x6C, 0x66, 0xE6, 0x00 }, // U+004B (K)
    .{ 0xF0, 0x60, 0x60, 0x60, 0x62, 0x66, 0xFE, 0x00 }, // U+004C (L)
    .{ 0xC6, 0xEE, 0xFE, 0xFE, 0xD6, 0xC6, 0xC6, 0x00 }, // U+004D (M)
    .{ 0xC6, 0xE6, 0xF6, 0xDE, 0xCE, 0xC6, 0xC6, 0x00 }, // U+004E (N)
    .{ 0x38, 0x6C, 0xC6, 0xC6, 0xC6, 0x6C, 0x38, 0x00 }, // U+004F (O)
    .{ 0xFC, 0x66, 0x66, 0x7C, 0x60, 0x60, 0xF0, 0x00 }, // U+0050 (P)
    .{ 0x78, 0xCC, 0xCC, 0xCC, 0xDC, 0x78, 0x1C, 0x00 }, // U+0051 (Q)
    .{ 0xFC, 0x66, 0x66, 0x7C, 0x6C, 0x66, 0xE6, 0x00 }, // U+0052 (R)
    .{ 0x78, 0xCC, 0xE0, 0x70, 0x1C, 0xCC, 0x78, 0x00 }, // U+0053 (S)
    .{ 0xFC, 0xB4, 0x30, 0x30, 0x30, 0x30, 0x78, 0x00 }, // U+0054 (T)
    .{ 0xCC, 0xCC, 0xCC, 0xCC, 0xCC, 0xCC, 0xFC, 0x00 }, // U+0055 (U)
    .{ 0xCC, 0xCC, 0xCC, 0xCC, 0xCC, 0x78, 0x30, 0x00 }, // U+0056 (V)
    .{ 0xC6, 0xC6, 0xC6, 0xD6, 0xFE, 0xEE, 0xC6, 0x00 }, // U+0057 (W)
    .{ 0xC6, 0xC6, 0x6C, 0x38, 0x38, 0x6C, 0xC6, 0x00 }, // U+0058 (X)
    .{ 0xCC, 0xCC, 0xCC, 0x78, 0x30, 0x30, 0x78, 0x00 }, // U+0059 (Y)
    .{ 0xFE, 0xC6, 0x8C, 0x18, 0x32, 0x66, 0xFE, 0x00 }, // U+005A (Z)
    .{ 0x78, 0x60, 0x60, 0x60, 0x60, 0x60, 0x78, 0x00 }, // U+005B ([)
    .{ 0xC0, 0x60, 0x30, 0x18, 0x0C, 0x06, 0x02, 0x00 }, // U+005C (\)
    .{ 0x78, 0x18, 0x18, 0x18, 0x18, 0x18, 0x78, 0x00 }, // U+005D (])
    .{ 0x10, 0x38, 0x6C, 0xC6, 0x00, 0x00, 0x00, 0x00 }, // U+005E (^)
    .{ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF }, // U+005F (_)
    .{ 0x30, 0x30, 0x18, 0x00, 0x00, 0x00, 0x00, 0x00 }, // U+0060 (`)
    .{ 0x00, 0x00, 0x78, 0x0C, 0x7C, 0xCC, 0x76, 0x00 }, // U+0061 (a)
    .{ 0xE0, 0x60, 0x60, 0x7C, 0x66, 0x66, 0xDC, 0x00 }, // U+0062 (b)
    .{ 0x00, 0x00, 0x78, 0xCC, 0xC0, 0xCC, 0x78, 0x00 }, // U+0063 (c)
    .{ 0x1C, 0x0C, 0x0C, 0x7C, 0xCC, 0xCC, 0x76, 0x00 }, // U+0064 (d)
    .{ 0x00, 0x00, 0x78, 0xCC, 0xFC, 0xC0, 0x78, 0x00 }, // U+0065 (e)
    .{ 0x38, 0x6C, 0x60, 0xF0, 0x60, 0x60, 0xF0, 0x00 }, // U+0066 (f)
    .{ 0x00, 0x00, 0x76, 0xCC, 0xCC, 0x7C, 0x0C, 0xF8 }, // U+0067 (g)
    .{ 0xE0, 0x60, 0x6C, 0x76, 0x66, 0x66, 0xE6, 0x00 }, // U+0068 (h)
    .{ 0x30, 0x00, 0x70, 0x30, 0x30, 0x30, 0x78, 0x00 }, // U+0069 (i)
    .{ 0x0C, 0x00, 0x0C, 0x0C, 0x0C, 0xCC, 0xCC, 0x78 }, // U+006A (j)
    .{ 0xE0, 0x60, 0x66, 0x6C, 0x78, 0x6C, 0xE6, 0x00 }, // U+006B (k)
    .{ 0x70, 0x30, 0x30, 0x30, 0x30, 0x30, 0x78, 0x00 }, // U+006C (l)
    .{ 0x00, 0x00, 0xCC, 0xFE, 0xFE, 0xD6, 0xC6, 0x00 }, // U+006D (m)
    .{ 0x00, 0x00, 0xF8, 0xCC, 0xCC, 0xCC, 0xCC, 0x00 }, // U+006E (n)
    .{ 0x00, 0x00, 0x78, 0xCC, 0xCC, 0xCC, 0x78, 0x00 }, // U+006F (o)
    .{ 0x00, 0x00, 0xDC, 0x66, 0x66, 0x7C, 0x60, 0xF0 }, // U+0070 (p)
    .{ 0x00, 0x00, 0x76, 0xCC, 0xCC, 0x7C, 0x0C, 0x1E }, // U+0071 (q)
    .{ 0x00, 0x00, 0xDC, 0x76, 0x66, 0x60, 0xF0, 0x00 }, // U+0072 (r)
    .{ 0x00, 0x00, 0x7C, 0xC0, 0x78, 0x0C, 0xF8, 0x00 }, // U+0073 (s)
    .{ 0x10, 0x30, 0x7C, 0x30, 0x30, 0x34, 0x18, 0x00 }, // U+0074 (t)
    .{ 0x00, 0x00, 0xCC, 0xCC, 0xCC, 0xCC, 0x76, 0x00 }, // U+0075 (u)
    .{ 0x00, 0x00, 0xCC, 0xCC, 0xCC, 0x78, 0x30, 0x00 }, // U+0076 (v)
    .{ 0x00, 0x00, 0xC6, 0xD6, 0xFE, 0xFE, 0x6C, 0x00 }, // U+0077 (w)
    .{ 0x00, 0x00, 0xC6, 0x6C, 0x38, 0x6C, 0xC6, 0x00 }, // U+0078 (x)
    .{ 0x00, 0x00, 0xCC, 0xCC, 0xCC, 0x7C, 0x0C, 0xF8 }, // U+0079 (y)
    .{ 0x00, 0x00, 0xFC, 0x98, 0x30, 0x64, 0xFC, 0x00 }, // U+007A (z)
    .{ 0x1C, 0x30, 0x30, 0xE0, 0x30, 0x30, 0x1C, 0x00 }, // U+007B ({)
    .{ 0x18, 0x18, 0x18, 0x00, 0x18, 0x18, 0x18, 0x00 }, // U+007C (|)
    .{ 0xE0, 0x30, 0x30, 0x1C, 0x30, 0x30, 0xE0, 0x00 }, // U+007D (})
    .{ 0x76, 0xDC, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 }, // U+007E (~)
    .{ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 }, // U+007F
};

// Global variables to store our usize pointers
// 0 - width
// 1 - height
// 2 - offset
// 3 - length
// 4 - general use ptr
// 5 - general use ptr
var g_pointers: [6]*usize = undefined;
var allocator = std.heap.page_allocator;

//original things
var original_image: []u8 = undefined;
var ascii_image: []u8 = undefined;

var ascii_chars: []const u8 = undefined;
var ascii_chars_memory: []u8 = undefined;

const default_chars = " .:-=+*%@#";
const full_chars = " .-:=+iltIcsv1x%7aejorzfnuCJT3*69LYpqy25SbdgFGOVXkPhmw48AQDEHKUZR@B#NW0M";

const threshold = 50;

export fn addToMemory(thing: usize, size: usize) usize {
    if (thing == 0) {
        allocator.free(original_image);
        original_image = allocator.alloc(u8, size) catch unreachable;
        return @intFromPtr(original_image.ptr);
    }
    if (thing == 1) {
        allocator.free(ascii_chars_memory);
        ascii_chars_memory = allocator.alloc(u8, size) catch unreachable;
        return @intFromPtr(ascii_chars_memory.ptr);
    }
    return 0;
}
//clear original chars? / same image re-run?

const Args = struct {
    color: bool,
    invert_color: bool,
    scale: f32,
    detect_edges: bool,
    sigma1: f32,
    sigma2: f32,
    brightness_boost: f32,
    block_size: u8,
    threshold_disabled: bool,
    custom_color: bool,
    r: u8,
    g: u8,
    b: u8,
    background_color: bool,
    b_r: u8,
    b_g: u8,
    b_b: u8,
    b_a: u8,
    text_only: bool,
};

const Image = struct {
    data: []u8,
    width: usize,
    height: usize,
    channels: usize,
};

const SobelFilter = struct {
    magnitude: []f32,
    direction: []f32,
};

const EdgeData = struct {
    grayscale: []u8,
    magnitude: []f32,
    direction: []f32,
};

export fn init() bool {
    for (0..6) |i| {
        g_pointers[i] = allocator.create(usize) catch unreachable;
        g_pointers[i].* = 0; // Initialize to 0
    }
    return true;
}

export fn getPointer(index: usize) usize {
    return @intFromPtr(g_pointers[index]);
}

export fn readValue(index: usize) usize {
    return g_pointers[index].*;
}

export fn writeValue(index: usize, value: usize) void {
    g_pointers[index].* = value;
}

var rescaled: []u8 = undefined;
var edge_result_: EdgeData = undefined;

var scale_: f32 = undefined;
var detect_edges_: i32 = undefined;
var sigma1_: f32 = undefined;
var sigma2_: f32 = undefined;

export fn processImage(
    color: i32,
    invert_color: i32,
    scale: f32,
    detect_edges: i32,
    sigma1: f32,
    sigma2: f32,
    brightness_boost: f32,
    full_characters: bool,
    block_size: i32,
    threshold_disabled: i32,
    custom_color: i32,
    r: i32,
    g: i32,
    b: i32,
    background_color: i32,
    b_r: i32,
    b_g: i32,
    b_b: i32,
    b_a: i32,
    text_only: i32,
) bool {
    const args = Args{
        .color = color != 0, // 0 (undefined or false) becomes false, anything else is true
        .invert_color = invert_color != 0,
        .scale = if (std.math.isNan(scale)) 1 else scale,
        .detect_edges = detect_edges != 0,
        .sigma1 = if (std.math.isNan(sigma1)) 0.5 else sigma1,
        .sigma2 = if (std.math.isNan(sigma2)) 1 else sigma2,
        .brightness_boost = if (std.math.isNan(brightness_boost)) 1.0 else brightness_boost,
        .block_size = if (block_size <= 0) 8 else @intCast(block_size),
        .threshold_disabled = threshold_disabled != 0,
        .custom_color = custom_color != 0,
        .r = if (r <= 0) 0 else @intCast(r),
        .g = if (g <= 0) 0 else @intCast(g),
        .b = if (b <= 0) 0 else @intCast(b),
        .background_color = background_color != 0,
        .b_r = if (b_r <= 0) 0 else @intCast(b_r),
        .b_g = if (b_g <= 0) 0 else @intCast(b_g),
        .b_b = if (b_b <= 0) 0 else @intCast(b_b),
        .b_a = if (b_a <= 0) 0 else @intCast(b_a),
        .text_only = text_only != 0,
    };

    if (ascii_chars_memory.len == 0) {
        if (full_characters) {
            ascii_chars = full_chars[0..];
        } else {
            ascii_chars = default_chars[0..];
        }
    } else {
        ascii_chars = ascii_chars_memory[0..ascii_chars_memory.len];
    }

    const width: usize = readValue(0);
    const height: usize = readValue(1);

    const updated_scale = (@as(f32, 1.0) / scale); //stablize for block size?

    const n_w = @as(usize, @intFromFloat(@round(@as(f32, @floatFromInt(width)) / updated_scale)));
    const n_h = @as(usize, @intFromFloat(@round(@as(f32, @floatFromInt(height)) / updated_scale)));

    var out_w: usize = (n_w / args.block_size) * args.block_size;
    var out_h: usize = (n_h / args.block_size) * args.block_size;

    var image = Image{
        .data = undefined,
        .width = out_w,
        .height = out_h,
        .channels = 3,
    };

    rescaled = linearRescale(original_image, width, height, out_w, out_h);
    image.data = rescaled;
    scale_ = updated_scale;

    edge_result_ = detectEdges(image, args);

    const ascii_img = generateAsciiArt(image, edge_result_, args);

    if (args.text_only) {
        out_w /= args.block_size;
        out_h /= args.block_size;
    }

    writeValue(0, out_w);
    writeValue(1, out_h);
    writeValue(2, @intFromPtr(ascii_img.ptr));
    writeValue(3, ascii_img.len);

    freeEdgeResult();
    allocator.free(rescaled);

    return true;
}

export fn initImage() bool {
    const width: usize = readValue(0);
    const height: usize = readValue(1);
    freeEdgeResult();
    scale_ = undefined;
    detect_edges_ = undefined;
    sigma1_ = undefined;
    sigma2_ = undefined;
    allocator.free(rescaled);
    original_image = rgbaToRgb(original_image, width, height);
    return true;
}

export fn releaseImage() bool {
    allocator.free(ascii_image);
    return true;
}

export fn initCharacters(sort: bool) bool {
    if (sort) {
        sortImageCharacters();
    }
    return true;
}

export fn releaseText() bool {
    allocator.free(ascii_chars_memory);
    return true;
}

fn freeEdgeResult() void {
    allocator.free(edge_result_.grayscale);
    allocator.free(edge_result_.magnitude);
    allocator.free(edge_result_.direction);
}

export fn releaseAll() bool {
    allocator.free(ascii_image);
    allocator.free(original_image);
    allocator.free(ascii_chars_memory);
    freeEdgeResult();
    scale_ = undefined;
    detect_edges_ = undefined;
    sigma1_ = undefined;
    sigma2_ = undefined;
    allocator.free(rescaled);
    return true;
}

export fn sortImageCharacters() void {
    ascii_chars = ascii_chars_memory[0..ascii_chars_memory.len];
    ascii_chars = sortCharsBySize(ascii_chars);
    allocator.free(ascii_chars_memory);
}

fn sortCharsBySize(input: []const u8) []const u8 {
    const CharInfo = struct {
        char: u8,
        size: usize,
    };

    var char_infos = std.ArrayList(CharInfo).init(allocator);
    defer char_infos.deinit();

    for (input) |char| {
        if (char >= 128) continue; // Skip non-ASCII characters

        const bitmap = font_bitmap[char];
        var size: usize = 0;

        for (bitmap) |row| {
            size += @popCount(row);
        }

        if (size == 0 and char != ' ') continue; // Skip zero-size characters except space

        char_infos.append(.{ .char = char, .size = size }) catch unreachable;
    }

    // Sort characters by size
    std.mem.sort(CharInfo, char_infos.items, {}, struct {
        fn lessThan(_: void, a: CharInfo, b: CharInfo) bool {
            return a.size < b.size;
        }
    }.lessThan);

    // Create the sorted string
    var result = allocator.alloc(u8, char_infos.items.len) catch unreachable;
    for (char_infos.items, 0..) |char_info, i| {
        result[i] = char_info.char;
    }

    // Print the sorted string
    //std.debug.print("Sorted string: {s}\n", .{result});

    // Convert []u8 to []const u8 before returning
    return result[0..];
}

pub fn rgbaToRgb(rgba: []u8, width: usize, height: usize) []u8 {
    const rgba_len = rgba.len;
    const rgb_len = width * height * 3;

    var rgb = allocator.alloc(u8, rgb_len) catch unreachable;

    var i: usize = 0;
    var j: usize = 0;
    while (i < rgba_len) : (i += 4) {
        rgb[j] = rgba[i]; // R
        rgb[j + 1] = rgba[i + 1]; // G
        rgb[j + 2] = rgba[i + 2]; // B
        j += 3;
    }

    allocator.free(original_image);
    return rgb;
}

fn linearRescale(rgba_image: []u8, width: usize, height: usize, new_width: usize, new_height: usize) []u8 {
    var rgb_image = allocator.alloc(u8, new_width * new_height * 3) catch unreachable;

    const x_scale = @as(f32, @floatFromInt(width)) / @as(f32, @floatFromInt(new_width));
    const y_scale = @as(f32, @floatFromInt(height)) / @as(f32, @floatFromInt(new_height));

    var y: usize = 0;
    while (y < new_height) : (y += 1) {
        const src_y = @as(usize, @intFromFloat(@as(f32, @floatFromInt(y)) * y_scale));

        var x: usize = 0;
        while (x < new_width) : (x += 1) {
            const src_x = @as(usize, @intFromFloat(@as(f32, @floatFromInt(x)) * x_scale));

            const src_index = (src_y * width + src_x) * 3;
            const dst_index = (y * new_width + x) * 3;

            rgb_image[dst_index + 0] = rgba_image[src_index + 0];
            rgb_image[dst_index + 1] = rgba_image[src_index + 1];
            rgb_image[dst_index + 2] = rgba_image[src_index + 2];
        }
    }

    return rgb_image;
}

fn detectEdges(img: Image, args: Args) EdgeData {
    if (!args.detect_edges) {
        return .{ .grayscale = &[_]u8{}, .magnitude = &[_]f32{}, .direction = &[_]f32{} };
    }

    const grayscale_img = rgbToGrayscale(img.data);
    const dog_img = differenceOfGaussians(.{
        .data = grayscale_img,
        .width = img.width,
        .height = img.height,
        .channels = img.channels,
    }, args.sigma1, args.sigma2);

    const edge_result2 = applySobelFilter(dog_img, img.width, img.height);
    allocator.free(dog_img);

    return .{ .grayscale = grayscale_img, .magnitude = edge_result2.magnitude, .direction = edge_result2.direction };
}

pub fn rgbToGrayscale(rgba: []u8) []u8 {
    const len = rgba.len;
    var rgb = allocator.alloc(u8, len) catch unreachable;

    var i: usize = 0;
    var j: usize = 0;
    while (i < len) : (i += 3) {
        const gray = @as(u8, @intFromFloat(@round(@as(f32, 0.299) * @as(f32, @floatFromInt(rgba[i])) +
            @as(f32, 0.587) * @as(f32, @floatFromInt(rgba[i + 1])) +
            @as(f32, 0.114) * @as(f32, @floatFromInt(rgba[i + 2])))));
        rgb[j] = gray; // R
        rgb[j + 1] = gray; // G
        rgb[j + 2] = gray; // B
        j += 3;
    }
    return rgb;
}

fn differenceOfGaussians(img: Image, sigma1: f32, sigma2: f32) []u8 {
    const image1 = applyGaussianBlur(img.data, img.width, img.height, sigma1);
    defer allocator.free(image1);
    const image2 = applyGaussianBlur(img.data, img.width, img.height, sigma2);
    defer allocator.free(image2);

    const result = allocator.alloc(u8, image1.len) catch unreachable;

    var i: usize = 0;
    while (i < image1.len) : (i += 1) {
        const diff = @as(i16, image1[i]) - @as(i16, image2[i]);
        const adjusted = diff + 128;
        result[i] = @intCast(std.math.clamp(adjusted, 0, 255));
    }

    return result;
}

pub fn applyGaussianBlur(
    image: []u8,
    width: usize,
    height: usize,
    sigma: f32,
) []u8 {
    const kernel = gaussianKernel(sigma);
    const blurred = allocator.alloc(u8, image.len) catch unreachable;

    // Temporary buffer for intermediate results
    const temp = allocator.alloc(u8, image.len) catch unreachable;
    defer allocator.free(temp);

    // Horizontal pass
    for (0..height) |y| {
        for (0..width) |x| {
            applyKernel(image, temp, x, y, width, height, kernel, true);
        }
    }

    // Vertical pass
    for (0..height) |y| {
        for (0..width) |x| {
            applyKernel(temp, blurred, x, y, width, height, kernel, false);
        }
    }

    defer allocator.free(kernel);
    return blurred;
}

fn applyKernel(
    src: []u8,
    dst: []u8,
    x: usize,
    y: usize,
    width: usize,
    height: usize,
    kernel: []f32,
    horizontal: bool,
) void {
    const channels = 3;
    const half_kernel = kernel.len / 2;
    var sums = [_]f32{ 0, 0, 0 };

    for (0..kernel.len) |i| {
        const ki = @as(i32, @intCast(i)) - @as(i32, @intCast(half_kernel));
        const sample_x = if (horizontal) std.math.clamp(@as(i32, @intCast(x)) + ki, 0, @as(i32, @intCast(width - 1))) else @as(i32, @intCast(x));
        const sample_y = if (horizontal) @as(i32, @intCast(y)) else std.math.clamp(@as(i32, @intCast(y)) + ki, 0, @as(i32, @intCast(height - 1)));
        const sample_index = @as(usize, @intCast(sample_y)) * width * channels + @as(usize, @intCast(sample_x)) * channels;

        for (0..3) |c| {
            sums[c] += @as(f32, @floatFromInt(src[sample_index + c])) * kernel[i];
        }
    }

    const dst_index = y * width * channels + x * channels;
    for (0..3) |c| {
        dst[dst_index + c] = @as(u8, @intFromFloat(std.math.clamp(sums[c], 0, 255)));
    }
}

fn gaussianKernel(sigma: f32) []f32 {
    const size: usize = @intFromFloat(6 * sigma);
    const kernel_size = if (size % 2 == 0) size + 1 else size;
    const half: f32 = @floatFromInt(kernel_size / 2);

    var kernel = allocator.alloc(f32, kernel_size) catch unreachable;
    var sum: f32 = 0;

    for (0..kernel_size) |i| {
        const x = @as(f32, @floatFromInt(i)) - half;
        kernel[i] = @exp(-(x * x) / (2 * sigma * sigma));
        sum += kernel[i];
    }

    // Normalize the kernel
    for (0..kernel_size) |i| {
        kernel[i] /= sum;
    }

    return kernel;
}

pub fn applySobelFilter(
    rgb_image: []u8,
    width: usize,
    height: usize,
) SobelFilter {
    const Gx = [_][3]i32{
        .{ -1, 0, 1 },
        .{ -2, 0, 2 },
        .{ -1, 0, 1 },
    };
    const Gy = [_][3]i32{
        .{ -1, -2, -1 },
        .{ 0, 0, 0 },
        .{ 1, 2, 1 },
    };

    var magnitude = allocator.alloc(f32, width * height) catch unreachable;
    var direction = allocator.alloc(f32, width * height) catch unreachable;

    const getPixel = struct {
        fn f(img: []const u8, w: usize, h: usize, x: i32, y: i32) [3]u8 {
            const px = std.math.clamp(x, 0, @as(i32, @intCast(w)) - 1);
            const py = std.math.clamp(y, 0, @as(i32, @intCast(h)) - 1);
            const idx = @as(usize, @intCast(py)) * w * 3 + @as(usize, @intCast(px)) * 3;
            return .{ img[idx], img[idx + 1], img[idx + 2] };
        }
    }.f;

    for (0..height) |y| {
        for (0..width) |x| {
            var gx: f32 = 0;
            var gy: f32 = 0;

            for (0..3) |ky| {
                for (0..3) |kx| {
                    const px = @as(i32, @intCast(x)) + @as(i32, @intCast(kx)) - 1;
                    const py = @as(i32, @intCast(y)) + @as(i32, @intCast(ky)) - 1;

                    const pixel = getPixel(rgb_image, width, height, px, py);
                    const gray = @as(f32, @floatFromInt(pixel[0])) * 0.299 +
                        @as(f32, @floatFromInt(pixel[1])) * 0.587 +
                        @as(f32, @floatFromInt(pixel[2])) * 0.114;

                    gx += gray * @as(f32, @floatFromInt(Gx[ky][kx]));
                    gy += gray * @as(f32, @floatFromInt(Gy[ky][kx]));
                }
            }

            const idx = y * width + x;
            magnitude[idx] = std.math.sqrt(gx * gx + gy * gy);
            direction[idx] = std.math.atan2(gy, gx);
        }
    }

    return .{ .magnitude = magnitude, .direction = direction };
}

fn generateAsciiArt(
    img: Image,
    edge_result: EdgeData,
    args: Args,
) []u8 {
    const out_w = @as(usize, (img.width / args.block_size) * args.block_size);
    const out_h = (img.height / args.block_size) * args.block_size;

    const text_w = out_w / args.block_size;
    const text_h = out_h / args.block_size;

    var background: [4]u8 = .{ 0, 0, 0, 255 };
    if (args.background_color) {
        background = .{ args.b_r, args.b_g, args.b_b, args.b_a };
    }
    if (args.invert_color) {
        if (args.background_color) {
            background = .{ 255 - background[0], 255 - background[1], 255 - background[2], args.b_a };
        } else {
            background = .{ 255 - background[0], 255 - background[1], 255 - background[2], 255 };
        }
    }

    var ascii_img: []u8 = undefined;
    if (args.text_only) {
        ascii_img = allocator.alloc(u8, text_w * text_h) catch unreachable;
    } else {
        ascii_img = allocator.alloc(u8, out_w * out_h * 4) catch unreachable;
    }
    @memset(ascii_img, 0);

    var y: usize = 0;
    while (y < out_h) : (y += args.block_size) {
        var x: usize = 0;
        while (x < out_w) : (x += args.block_size) {
            const block_info = calculateBlockInfo(img, edge_result, x, y, out_w, out_h, args);
            const ascii_char = selectAsciiChar(block_info, args);
            if (args.text_only) {
                const idx = (y / args.block_size) * text_w + (x / args.block_size);
                ascii_img[idx] = ascii_char;
            } else {
                const avg_color = calculateAverageColor(block_info, args);
                convertToAscii(ascii_img, out_w, out_h, x, y, ascii_char, avg_color, args.block_size, background);
            }
        }
    }

    return ascii_img;
}

fn convertToAscii(
    img: []u8,
    w: usize,
    h: usize,
    x: usize,
    y: usize,
    ascii_char: u8,
    color: [3]u8,
    block_size: u8,
    background: [4]u8,
) void {
    if (ascii_char < 32 or ascii_char > 126) {
        // std.debug.print("Error: invalid ASCII character: {}\n", .{ascii_char});
        return;
    }

    //webgpu multiply index - 1 * 8, * 2 (u32)???
    const bitmap = &font_bitmap[ascii_char];
    const block_w = @min(block_size, w - x);
    const block_h = @min(block_size, img.len / (w * 3) - y);

    var dy: usize = 0;
    while (dy < block_h) : (dy += 1) {
        var dx: usize = 0;
        while (dx < block_w) : (dx += 1) {
            const img_x = x + dx;
            const img_y = y + dy;

            if (img_x < w and img_y < h) {
                const idx = (img_y * w + img_x) * 4;
                const shift: u3 = @intCast(7 - dx);
                const bit: u8 = @as(u8, 1) << shift;
                if ((bitmap[dy] & bit) != 0) {
                    // Character pixel: use the original color
                    img[idx] = color[0];
                    img[idx + 1] = color[1];
                    img[idx + 2] = color[2];
                    img[idx + 3] = 255;
                } else {
                    // not a character pixel: set to black
                    img[idx] = background[0];
                    img[idx + 1] = background[1];
                    img[idx + 2] = background[2];
                    img[idx + 3] = background[3];
                }
            }
        }
    }
}

const BlockInfo = struct {
    sum_brightness: u64,
    sum_color: [3]u64,
    pixel_count: u64,
    sum_mag: f32,
    sum_dir: f32,
};

fn calculateBlockInfo(img: Image, edge_result: EdgeData, x: usize, y: usize, out_w: usize, out_h: usize, args: Args) BlockInfo {
    var info = BlockInfo{ .sum_brightness = 0, .sum_color = .{ 0, 0, 0 }, .pixel_count = 0, .sum_mag = 0, .sum_dir = 0 };

    const block_w = @min(args.block_size, out_w - x);
    const block_h = @min(args.block_size, out_h - y);

    for (0..block_h) |dy| {
        for (0..block_w) |dx| {
            const ix = x + dx;
            const iy = y + dy;
            if (ix >= img.width or iy >= img.height) {
                continue;
            }
            const pixel_index = (iy * img.width + ix) * img.channels;
            if (pixel_index + 2 >= img.width * img.height * img.channels) {
                continue;
            }
            const r = img.data[pixel_index];
            const g = img.data[pixel_index + 1];
            const b = img.data[pixel_index + 2];
            const gray: u64 = @intFromFloat(@as(f32, @floatFromInt(r)) * 0.3 + @as(f32, @floatFromInt(g)) * 0.59 + @as(f32, @floatFromInt(b)) * 0.11);
            info.sum_brightness += gray;
            if (args.color) {
                info.sum_color[0] += r;
                info.sum_color[1] += g;
                info.sum_color[2] += b;
            }
            if (args.detect_edges) {
                const edge_index = iy * img.width + ix;
                info.sum_mag += edge_result.magnitude[edge_index];
                info.sum_dir += edge_result.direction[edge_index];
            }
            info.pixel_count += 1;
        }
    }

    return info;
}

fn selectAsciiChar(block_info: BlockInfo, args: Args) u8 {
    const avg_brightness: usize = @intCast(block_info.sum_brightness / block_info.pixel_count);
    const boosted_brightness: usize = @intFromFloat(@as(f32, @floatFromInt(avg_brightness)) * args.brightness_boost);
    const clamped_brightness = std.math.clamp(boosted_brightness, 0, 255);

    if (args.detect_edges) {
        const avg_mag: f32 = block_info.sum_mag / @as(f32, @floatFromInt(block_info.pixel_count));
        const avg_dir: f32 = block_info.sum_dir / @as(f32, @floatFromInt(block_info.pixel_count));
        if (getEdgeChar(avg_mag, avg_dir, args.threshold_disabled)) |ec| {
            return ec;
        }
    }

    if (clamped_brightness == 0) {
        return ' ';
    } else {
        const stablize: f32 = @as(f32, @floatFromInt(clamped_brightness)) / @as(f32, 255);
        const total: u8 = @as(u8, @intCast(ascii_chars.len)) - 1;
        const total_characters: f32 = stablize * @as(f32, @floatFromInt(total));
        const single_character: u8 = @as(u8, @intFromFloat(@round(total_characters)));
        const clamp_character: u8 = std.math.clamp(single_character, 0, total);
        return ascii_chars[clamp_character];
    }
}

fn getEdgeChar(mag: f32, dir: f32, threshold_disabled: bool) ?u8 {
    if (mag < threshold and !threshold_disabled) {
        return null;
    }

    const angle = (dir + std.math.pi) * (@as(f32, 180) / std.math.pi);
    return switch (@as(u8, @intFromFloat(@mod(angle + 22.5, 180) / 45))) {
        0, 4 => '-',
        1, 5 => '/',
        2, 6 => '|',
        3, 7 => '\\',
        else => unreachable,
    };
}

fn calculateAverageColor(block_info: BlockInfo, args: Args) [3]u8 {
    if (args.color) {
        if (args.custom_color) {
            var color = [3]u8{
                args.r,
                args.g,
                args.b,
            };
            if (args.invert_color) {
                color[0] = 255 - color[0];
                color[1] = 255 - color[1];
                color[2] = 255 - color[2];
            }
            return color;
        } else {
            var color = [3]u8{
                @intCast(block_info.sum_color[0] / block_info.pixel_count),
                @intCast(block_info.sum_color[1] / block_info.pixel_count),
                @intCast(block_info.sum_color[2] / block_info.pixel_count),
            };

            if (args.invert_color) {
                color[0] = 255 - color[0];
                color[1] = 255 - color[1];
                color[2] = 255 - color[2];
            }
            return color;
        }
    } else {
        if (args.custom_color) {
            var color = [3]u8{
                args.r,
                args.g,
                args.b,
            };
            if (args.invert_color) {
                color[0] = 255 - color[0];
                color[1] = 255 - color[1];
                color[2] = 255 - color[2];
            }
            return color;
        } else {
            if (args.invert_color) {
                return .{ 0, 0, 0 };
            } else {
                return .{ 255, 255, 255 };
            }
        }
    }
}
