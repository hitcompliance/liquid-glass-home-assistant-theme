#!/usr/bin/env ruby
require 'json'
require 'yaml'

root = File.expand_path('..', __dir__)
theme_files = Dir.glob(File.join(root, 'themes', '*.yaml'))
abort 'HACS requires exactly one theme YAML file' unless theme_files.length == 1

themes = YAML.load_file(theme_files.first)
expected = ['Liquid Glass', 'Liquid Glass Motion']
abort 'Unexpected theme names' unless themes.keys == expected

themes.each do |name, vars|
  abort "Missing card-mod theme identity for #{name}" unless vars['card-mod-theme'] == name
  abort "Missing dark mode for #{name}" unless vars.dig('modes', 'dark', 'dark-mode') == true
  %w[ha-card-background divider-color primary-text-color lg-surface lg-outline lg-blur
     card-mod-card card-mod-dialog card-mod-more-info].each do |key|
    abort "Missing #{key} in #{name}" unless vars[key].is_a?(String) && !vars[key].empty?
  end
  css = vars.fetch('card-mod-card')
  abort "Reduced-motion support missing in #{name}" unless css.include?('prefers-reduced-motion: reduce')
  abort "Unexpected geometry override in #{name}" if css.match?(/\b(?:overflow|width|height|z-index|pointer-events|transform)\s*:/)
end

abort 'Static variant animates' unless themes['Liquid Glass']['lg-motion-duration'] == '0ms'
abort 'Motion variant has no transition' unless themes['Liquid Glass Motion']['lg-motion-duration'] == '180ms'
abort 'Missing wallpaper' unless File.file?(File.join(root, 'assets', 'liquid-glass-living-room.jpg'))
abort 'Invalid HACS manifest' unless JSON.parse(File.read(File.join(root, 'hacs.json')))['name']

puts 'Theme structure, motion, card geometry, and HACS packaging: OK'
