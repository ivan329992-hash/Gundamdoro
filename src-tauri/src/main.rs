// Windows 发布版使用图形界面子系统，启动时不创建控制台窗口。
#![cfg_attr(all(not(debug_assertions), target_os = "windows"), windows_subsystem = "windows")]

fn main() {
    gundamdoro_lib::run();
}
