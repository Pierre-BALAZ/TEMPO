<?php
/**
 * Plugin Name: TEMPO Sync
 * Description: Synchronisation temps réel (par « salle » éphémère) pour la Partition d'urgence TEMPO. Aucune donnée durable, aucune identité réelle.
 * Version: 1.0.0
 * Author: TEMPO
 */

if (!defined('ABSPATH')) exit;

// Durée de vie d'une salle sans activité (éphémère).
if (!defined('TEMPO_ROOM_TTL')) define('TEMPO_ROOM_TTL', 12 * HOUR_IN_SECONDS);

/** En-têtes CORS sur toutes les réponses REST (pas de cookies → origine * possible). */
add_action('rest_api_init', function () {
    remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
    add_filter('rest_pre_serve_request', function ($served) {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type');
        return $served;
    });
}, 15);

add_action('rest_api_init', function () {
    register_rest_route('tempo/v1', '/room/(?P<code>[A-Za-z0-9\-]+)', array(
        array(
            'methods'             => 'GET',
            'permission_callback' => '__return_true',
            'callback'            => 'tempo_room_get',
        ),
        array(
            'methods'             => 'POST',
            'permission_callback' => '__return_true',
            'callback'            => 'tempo_room_post',
        ),
    ));
});

function tempo_room_key($code) {
    $code = preg_replace('/[^A-Za-z0-9\-]/', '', (string) $code);
    return 'tempo_room_' . substr($code, 0, 80);
}

function tempo_room_get(WP_REST_Request $req) {
    $data = get_transient(tempo_room_key($req['code']));
    if (!is_array($data)) {
        return new WP_REST_Response(array('v' => 0, 'case' => null), 200);
    }
    return new WP_REST_Response(array(
        'v'    => isset($data['v']) ? (int) $data['v'] : 0,
        'case' => isset($data['case']) ? $data['case'] : null,
    ), 200);
}

function tempo_room_post(WP_REST_Request $req) {
    $body = $req->get_body();
    if (strlen($body) > 300000) {
        return new WP_REST_Response(array('error' => 'payload trop volumineux'), 413);
    }
    $payload = json_decode($body, true);
    if (!is_array($payload) || !isset($payload['case'])) {
        return new WP_REST_Response(array('error' => 'JSON invalide'), 400);
    }
    $key = tempo_room_key($req['code']);
    $prev = get_transient($key);
    $v = (is_array($prev) && isset($prev['v'])) ? ((int) $prev['v'] + 1) : 1;
    $data = array('v' => $v, 'case' => $payload['case'], 'updated' => time());
    set_transient($key, $data, TEMPO_ROOM_TTL);
    return new WP_REST_Response(array('v' => $v, 'case' => $payload['case']), 200);
}
