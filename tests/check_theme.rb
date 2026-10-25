#!/usr/bin/env ruby
require 'json'
require 'yaml'

root = File.expand_path('..', __dir__)
theme_files = Dir.glob(File.join(root, 'themes', '*.yaml'))
abort 'HACS requires exactly one theme YAML file' unless theme_files.length == 1

themes = YAML.load_file(theme_files.first)
expected = ['DASH6 Satin Glass']
abort 'Unexpected theme names' unless themes.keys == expected
satin = themes.fetch('DASH6 Satin Glass')
abort 'Wrong card-mod identity' unless satin['card-mod-theme'] == expected.first
%w[dash6-satin-enabled dash6-satin-card-background dash6-satin-control-shadow].each do |key|
  abort "Missing Satin material #{key}" unless satin.key?(key)
end
abort 'Satin gate missing' unless satin['dash6-satin-enabled'].to_s == '1'
%w[ha-view-sections-column-gap ha-view-sections-row-gap ha-section-grid-row-gap ha-view-sections-column-min-width ha-section-grid-column-gap].each do |key|
  abort "Global native layout override #{key}" if satin.key?(key)
  abort "Missing scoped layout value #{key}" unless satin.key?('dash6-layout-' + key)
end
abort 'Missing wallpaper' unless File.file?(File.join(root, 'assets', 'liquid-glass-living-room.jpg'))
abort 'Invalid HACS manifest' unless JSON.parse(File.read(File.join(root, 'hacs.json')))['name']

Dir.glob(File.join(root, 'examples', '*.yaml')).each do |file|
  dashboard = YAML.load_file(file)
  next unless dashboard.is_a?(Hash) && dashboard['views'].is_a?(Array)
  dashboard['views'].each do |view|
    abort "Obsolete example theme in #{file}" if view['theme'] && view['theme'] != 'DASH6 Satin Glass'
  end
end

puts 'Theme structure, motion, card geometry, and HACS packaging: OK'
