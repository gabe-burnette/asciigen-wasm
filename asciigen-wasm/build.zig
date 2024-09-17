const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{
        .default_target = .{
            .cpu_arch = .wasm32,
            .os_tag = .freestanding,
        },
    });
    const optimize = b.standardOptimizeOption(.{ .preferred_optimize_mode = .ReleaseSmall });
    const exe = b.addExecutable(.{
        .name = "asciigen",
        .root_source_file = b.path("src/main.zig"),
        .target = target,
        .optimize = optimize,
    });

    exe.rdynamic = true;
    exe.entry = .disabled;

    // Set the initial page size (64KB per page)
    exe.initial_memory = 20 * 65536; // 64 pages = 4MB

    b.installArtifact(exe);
}
