(function (ko, util) {
    'use strict';

    var ns = util.namespace('kpp.viewmodel');

    ns.ChainHideMembersWithURL = ns.ChainHideMembersWithURL || ChainHideMembersWithURL;

    function ChainHideMembersWithURL(project) {
        var that = this;

        that.project = project;

        that.init = function () {
            that.updateVisible(that.parseQuery());
            project.members().forEach(function (member) {
                member.visible.subscribe(that.onUpdateVisible.bind(that, member));
            });
            project.members.subscribe(function (changes) {
                changes.forEach(function (change) {
                    var member = change.value;
                    if (change.status === 'added') {
                        if (!member.chainHideMembersWithURL_membersChangeSubscribe) {
                            member.chainHideMembersWithURL_membersChangeSubscribe = member.visible.subscribe(that.onUpdateVisible.bind(that, member));
                        }
                    } else {
                        if (member.chainHideMembersWithURL_membersChangeSubscribe) {
                            member.chainHideMembersWithURL_membersChangeSubscribe.dispose();
                        }
                    }
                });
            }, null, 'arrayChange');
        };

        // メンバーの可視/不可視が変更されたらURLも更新する
        that.onUpdateVisible = function (member, visible) {
            var hideMemberIds = that.parseQuery();
            var idx = hideMemberIds.indexOf(member._id());

            if (visible && idx !== -1) {
                // remove
                hideMemberIds.splice(idx, 1);
                that.updateURL(hideMemberIds);
            } else if (!visible && idx === -1) {
                // add
                hideMemberIds.push(member._id());
                that.updateURL(hideMemberIds);
            }
        };

        // 各メンバーの可視/不可視を更新
        that.updateVisible = function (hideMemberIds) {
            project.members().forEach(function (member) {
                member.visible(hideMemberIds.indexOf(member._id()) === -1);
            });
        };

        // hideMemberIdsのクエリを付加してURLを更新
        that.updateURL = function (hideMemberIds) {
            var qry = that.ignoreHideQuery();
            qry = '?' + (qry === '' ? '' : '&') + (hideMemberIds.length ? 'hide=' + hideMemberIds.join(',') : '');
            if (location.search !== qry) {
                history.replaceState(null, null, qry);
            }
        };

        // URLQueryからhideMemberIDリストを取り出す
        that.parseQuery = function() {
            var m = location.search.match(/hide=(.+)($|&)/);
            return m === null ? [] : m[1].split(',');
        };

        // hideクエリを除いたURL（パス）を返す
        that.ignoreHideQuery = function () {
            return location.search.replace(/hide=.+($|&)/, '').replace(/^\?/, '').replace(/^&$/, '');
        };

        that.init();
    }
}(ko, window.nakazawa.util));